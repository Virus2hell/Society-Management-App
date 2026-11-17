// /api/societies — things a logged-in user does BEFORE being inside a society:
// create a society, look up a join code, request to join, cancel/leave.
const express = require('express');
const db = require('../db');
const { generateFlats } = require('../flats');
const { uniqueCode } = require('../codes');
const { notifyUsers, usersWithRole } = require('../notify');

const router = express.Router();
const MAX_FLATS = 3000;

// POST /api/societies { name, address, city, wings, floors, flatsPerFloor }
// The creator becomes the secretary (already approved) and gets the join code.
router.post('/', async (req, res) => {
  const { name, address, city, wings, floors, flatsPerFloor } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ message: 'Society name is required' });
  const f = Number(floors);
  const n = Number(flatsPerFloor);
  if (!Number.isInteger(f) || f < 1 || f > 99) return res.status(400).json({ message: 'Floors must be between 1 and 99' });
  if (!Number.isInteger(n) || n < 1 || n > 99) return res.status(400).json({ message: 'Flats per floor must be between 1 and 99' });

  const flats = generateFlats({ wings, floors: f, flatsPerFloor: n });
  if (flats.length > MAX_FLATS) return res.status(400).json({ message: `Too many flats (max ${MAX_FLATS})` });
  const code = await uniqueCode('societies');

  // Society + secretary membership are created together (all or nothing)
  const result = await db.tx(async (c) => {
    const society = await db.one(
      `INSERT INTO societies (name, address, city, code, flats, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [String(name).trim(), String(address || '').trim(), String(city || '').trim(), code, flats, req.user.id], c
    );
    const membership = await db.one(
      `INSERT INTO memberships (user_id, society_id, role, flat, status, decided_at, decided_by)
       VALUES ($1, $2, 'secretary', NULL, 'approved', now(), $1) RETURNING *`,
      [req.user.id, society.id], c
    );
    return { society, membership };
  });
  res.status(201).json(result);
});

// GET /api/societies/lookup/:code — shows "You are joining X" + the flat list
router.get('/lookup/:code', async (req, res) => {
  const society = await db.one('SELECT id, name, address, city, flats FROM societies WHERE code = $1', [
    String(req.params.code).trim(),
  ]);
  if (!society) return res.status(404).json({ message: 'No society found with this code. Please check with your secretary.' });
  res.json(society);
});

// POST /api/societies/join { code, role: 'resident' | 'watchman', flat }
router.post('/join', async (req, res) => {
  const { code, role, flat } = req.body || {};
  const society = await db.one('SELECT * FROM societies WHERE code = $1', [String(code || '').trim()]);
  if (!society) return res.status(404).json({ message: 'Invalid society code' });
  if (!['resident', 'watchman'].includes(role)) return res.status(400).json({ message: 'Choose Resident or Watchman' });
  if (role === 'resident' && !society.flats.includes(flat)) return res.status(400).json({ message: 'Select your flat' });

  const existing = await db.one('SELECT * FROM memberships WHERE user_id = $1 AND society_id = $2', [req.user.id, society.id]);
  if (existing?.status === 'approved') return res.status(409).json({ message: 'You are already a member of this society' });
  if (existing?.status === 'pending') return res.status(409).json({ message: 'Your request is already waiting for approval' });

  // Insert, or re-open an old rejected/removed/left request (same row)
  const membership = await db.one(
    `INSERT INTO memberships (user_id, society_id, role, flat, status)
     VALUES ($1, $2, $3, $4, 'pending')
     ON CONFLICT (user_id, society_id) DO UPDATE
       SET role = EXCLUDED.role, flat = EXCLUDED.flat, status = 'pending',
           decided_at = NULL, decided_by = NULL, created_at = now()
     RETURNING *`,
    [req.user.id, society.id, role, role === 'resident' ? flat : null]
  );

  await notifyUsers(
    await usersWithRole(society.id, 'secretary'),
    'New join request',
    `${req.user.name} wants to join ${society.name} as ${role === 'resident' ? `resident of ${flat}` : 'watchman'}.`,
    { url: '/secretary/members', societyId: society.id, type: 'join_request' }
  );
  res.status(201).json({
    ...membership,
    society: { id: society.id, name: society.name, address: society.address, city: society.city },
  });
});

// DELETE /api/societies/memberships/:id — cancel my pending request, hide a rejected one,
// or leave a society (a secretary cannot leave while being the only secretary)
router.delete('/memberships/:id', async (req, res) => {
  const m = await db.one('SELECT * FROM memberships WHERE id = $1 AND user_id = $2', [Number(req.params.id), req.user.id]);
  if (!m) return res.status(404).json({ message: 'Membership not found' });

  if (m.status === 'approved' && m.role === 'secretary') {
    const others = (await usersWithRole(m.societyId, 'secretary')).filter((id) => id !== req.user.id);
    if (!others.length) {
      return res.status(400).json({ message: 'You are the only secretary. A society needs at least one secretary.' });
    }
  }
  await db.query(`UPDATE memberships SET status = 'left' WHERE id = $1`, [m.id]);
  res.json({ ok: true });
});

module.exports = router;
