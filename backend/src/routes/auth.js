// /api/auth — account sign up / login. An account is just a person;
// what they can do depends on their memberships in societies.
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, publicUser, requireAuth } = require('../auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// All societies this user belongs to (or asked to join), with society info.
// The join code is only included for approved secretaries.
async function membershipsOf(userId) {
  const rows = await db.query(
    `SELECT m.*, s.name AS s_name, s.address AS s_address, s.city AS s_city, s.code AS s_code
       FROM memberships m JOIN societies s ON s.id = m.society_id
      WHERE m.user_id = $1 AND m.status <> 'left'
      ORDER BY m.id DESC`,
    [userId]
  );
  return rows.map(({ sName, sAddress, sCity, sCode, ...m }) => ({
    ...m,
    society: {
      id: m.societyId,
      name: sName,
      address: sAddress,
      city: sCity,
      code: m.role === 'secretary' && m.status === 'approved' ? sCode : undefined,
    },
  }));
}

// POST /api/auth/signup { name, email, password }
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!name || !cleanEmail || !password) return res.status(400).json({ message: 'Name, email and password are required' });
  if (!EMAIL_RE.test(cleanEmail)) return res.status(400).json({ message: 'Enter a valid email address' });
  if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

  const exists = await db.one('SELECT 1 FROM users WHERE email = $1', [cleanEmail]);
  if (exists) return res.status(409).json({ message: 'An account with this email already exists. Please log in.' });

  const user = await db.one(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
    [String(name).trim(), cleanEmail, bcrypt.hashSync(String(password), 10)]
  );
  res.status(201).json({ token: signToken(user), user: publicUser(user), memberships: [] });
});

// POST /api/auth/login { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await db.one('SELECT * FROM users WHERE email = $1', [String(email || '').trim().toLowerCase()]);
  if (!user || !bcrypt.compareSync(String(password || ''), user.passwordHash)) {
    return res.status(401).json({ message: 'Wrong email or password' });
  }
  res.json({ token: signToken(user), user: publicUser(user), memberships: await membershipsOf(user.id) });
});

// GET /api/auth/me — current user + their societies (used on app start and to refresh)
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: publicUser(req.user), memberships: await membershipsOf(req.user.id) });
});

// PUT /api/auth/push-token { token }
router.put('/push-token', requireAuth, async (req, res) => {
  await db.query('UPDATE users SET push_token = $1 WHERE id = $2', [req.body?.token || null, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
