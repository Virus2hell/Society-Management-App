// Sends a notification to users in two ways:
// 1. Saves it in the "notifications" table. The app polls this, so it works
//    even in Expo Go (where remote push is not available on Android).
// 2. Sends a real push notification through Expo's push service when the
//    user's device registered a push token (development / release builds).
//
// data.societyId tells the app which society the notification belongs to,
// data.url which screen to open when it is tapped.
const db = require('./db');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendExpoPush(messages) {
  if (!messages.length) return;
  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.warn('Push send failed (ignored):', err.message);
  }
}

async function notifyUsers(userIds, title, body, data = {}) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return;
  // One INSERT for all users using unnest()
  await db.query(
    `INSERT INTO notifications (user_id, title, body, data)
     SELECT unnest($1::int[]), $2, $3, $4`,
    [ids, title, body, data]
  );
  const users = await db.query(
    `SELECT push_token FROM users WHERE id = ANY($1) AND push_token LIKE 'ExponentPushToken%'`,
    [ids]
  );
  sendExpoPush(users.map((u) => ({ to: u.pushToken, title, body, data, sound: 'default' }))); // fire and forget
}

// Residents living in a flat of a society
async function usersOfFlat(societyId, flat) {
  const rows = await db.query(
    `SELECT user_id FROM memberships WHERE society_id = $1 AND status = 'approved' AND role = 'resident' AND flat = $2`,
    [societyId, flat]
  );
  return rows.map((r) => r.userId);
}

async function usersWithRole(societyId, role) {
  const rows = await db.query(
    `SELECT user_id FROM memberships WHERE society_id = $1 AND status = 'approved' AND role = $2`,
    [societyId, role]
  );
  return rows.map((r) => r.userId);
}

async function allMembers(societyId) {
  const rows = await db.query(`SELECT user_id FROM memberships WHERE society_id = $1 AND status = 'approved'`, [societyId]);
  return rows.map((r) => r.userId);
}

module.exports = { notifyUsers, usersOfFlat, usersWithRole, allMembers };
