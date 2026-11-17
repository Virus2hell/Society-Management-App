// /api/society — the CURRENT society (chosen with the X-Society-Id header).
// Secretary: join code, regenerate code, approve/reject join requests,
// members list, remove members. Everyone: dashboard numbers.
const express = require('express');
const db = require('../db');
const { requireRole } = require('../auth');
const { uniqueCode } = require('../codes');
const { notifyUsers } = require('../notify');

const router = express.Router();

// Membership rows joined with the user's name + email
const MEMBER_SQL = `
  SELECT m.*, u.name, u.email
    FROM memberships m JOIN users u ON u.id = m.user_id
   WHERE m.society_id = $1 AND m.status = $2`;

// GET /api/society — info about the current society
router.get('/', (req, res) => {
  const s = req.society;
  res.json({
    id: s.id, name: s.name, address: s.address, city: s.city, flats: s.flats,
    code: req.membership.role === 'secretary' ? s.code : undefined,
    myRole: req.membership.role,
    myFlat: req.membership.flat,
  });
});

// POST /api/society/regenerate-code — old code stops working, members are not affected
router.post('/regenerate-code', requireRole('secretary'), async (req, res) => {
  const code = await uniqueCode('societies');
  await db.query('UPDATE societies SET code = $1 WHERE id = $2', [code, req.society.id]);
  res.json({ code });
});

// GET /api/society/requests — pending join requests
router.get('/requests', requireRole('secretary'), async (req, res) => {
  res.json(await db.query(`${MEMBER_SQL} ORDER BY m.id DESC`, [req.society.id, 'pending']));
});

// POST /api/society/requests/:id/decide { decision: 'approved' | 'rejected' }
router.post('/requests/:id/decide', requireRole('secretary'), async (req, res) => {
  const { decision } = req.body || {};
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ message: 'Decision must be approved or rejected' });

  // Only updates if it is still pending in THIS society
  const m = await db.one(
    `UPDATE memberships SET status = $1, decided_at = now(), decided_by = $2
      WHERE id = $3 AND society_id = $4 AND status = 'pending' RETURNING *`,
    [decision, req.user.id, Number(req.params.id), req.society.id]
  );
  if (!m) return res.status(404).json({ message: 'Request not found or already handled' });

  await notifyUsers(
    [m.userId],
    decision === 'approved' ? `Welcome to ${req.society.name}! 🎉` : 'Join request rejected',
    decision === 'approved'
      ? `Your request to join as ${m.role}${m.flat ? ` of ${m.flat}` : ''} was approved. Tap to open.`
      : `Your request to join ${req.society.name} was rejected by the secretary.`,
    { url: '/', societyId: req.society.id, type: 'membership' }
  );
  const user = await db.one('SELECT name, email FROM users WHERE id = $1', [m.userId]);
  res.json({ ...m, ...user });
});

// GET /api/society/members — approved members (secretary)
router.get('/members', requireRole('secretary'), async (req, res) => {
  const rows = await db.query(
    `${MEMBER_SQL}
     ORDER BY CASE m.role WHEN 'secretary' THEN 0 WHEN 'watchman' THEN 1 ELSE 2 END, m.flat NULLS FIRST, u.name`,
    [req.society.id, 'approved']
  );
  res.json(rows);
});

// DELETE /api/society/members/:id — remove someone who moved out / left the job
router.delete('/members/:id', requireRole('secretary'), async (req, res) => {
  const m = await db.one(
    `SELECT * FROM memberships WHERE id = $1 AND society_id = $2 AND status = 'approved'`,
    [Number(req.params.id), req.society.id]
  );
  if (!m) return res.status(404).json({ message: 'Member not found' });
  if (m.userId === req.user.id) return res.status(400).json({ message: 'You cannot remove yourself' });

  await db.query(`UPDATE memberships SET status = 'removed', decided_at = now(), decided_by = $1 WHERE id = $2`, [req.user.id, m.id]);
  await notifyUsers([m.userId], `Removed from ${req.society.name}`, 'The secretary removed you from this society.', {
    url: '/', societyId: req.society.id, type: 'membership',
  });
  res.json({ ok: true });
});

// GET /api/society/dashboard — numbers for the home screen of each role.
// Each number is one COUNT/SUM query with FILTER, done by the database.
router.get('/dashboard', async (req, res) => {
  const sid = req.society.id;
  const { role, flat } = req.membership;
  const latestNotice = await db.one('SELECT * FROM notices WHERE society_id = $1 ORDER BY id DESC LIMIT 1', [sid]);

  if (role === 'resident') {
    const stats = await db.one(
      `SELECT
         (SELECT count(*)::int FROM visitors WHERE society_id = $1 AND flat = $2 AND status = 'pending') AS pending_visitors,
         (SELECT count(*)::int FROM visitors WHERE society_id = $1 AND flat = $2 AND status = 'inside')  AS guests_inside,
         (SELECT count(*)::int FROM bills WHERE society_id = $1 AND flat = $2 AND status = 'unpaid')     AS unpaid_bills,
         (SELECT coalesce(sum(amount), 0)::int FROM bills WHERE society_id = $1 AND flat = $2 AND status = 'unpaid') AS amount_due,
         (SELECT count(*)::int FROM complaints WHERE society_id = $1 AND flat = $2 AND status <> 'resolved') AS open_complaints`,
      [sid, flat]
    );
    return res.json({ ...stats, latestNotice });
  }

  if (role === 'watchman') {
    const stats = await db.one(
      `SELECT count(*) FILTER (WHERE status = 'pending')::int AS waiting,
              count(*) FILTER (WHERE status = 'inside')::int  AS inside
         FROM visitors WHERE society_id = $1`,
      [sid]
    );
    return res.json({ ...stats, latestNotice });
  }

  const month = new Date().toISOString().slice(0, 7);
  const stats = await db.one(
    `SELECT
       (SELECT count(*) FILTER (WHERE status = 'approved' AND role = 'resident')::int FROM memberships WHERE society_id = $1) AS residents,
       (SELECT count(*) FILTER (WHERE status = 'approved' AND role = 'watchman')::int FROM memberships WHERE society_id = $1) AS watchmen,
       (SELECT count(*) FILTER (WHERE status = 'pending')::int FROM memberships WHERE society_id = $1) AS pending_requests,
       (SELECT count(*) FILTER (WHERE status = 'open')::int FROM complaints WHERE society_id = $1) AS open_complaints,
       (SELECT count(*) FILTER (WHERE status = 'in_progress')::int FROM complaints WHERE society_id = $1) AS in_progress_complaints,
       (SELECT coalesce(sum(amount) FILTER (WHERE status = 'paid'), 0)::int FROM bills WHERE society_id = $1 AND month = $2) AS collected,
       (SELECT coalesce(sum(amount) FILTER (WHERE status = 'unpaid'), 0)::int FROM bills WHERE society_id = $1 AND month = $2) AS pending_amount,
       (SELECT count(*) FILTER (WHERE status = 'unpaid')::int FROM bills WHERE society_id = $1 AND month = $2) AS unpaid_flats,
       (SELECT count(*)::int FROM visitors WHERE society_id = $1
           AND coalesce(entry_at, created_at) >= date_trunc('day', now())) AS visitors_today`,
    [sid, month]
  );
  res.json({ code: req.society.code, flats: req.society.flats.length, month, ...stats, latestNotice });
});

module.exports = router;
