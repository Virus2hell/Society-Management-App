// /api/notices — society notice board. Secretary posts, everyone reads.
const express = require('express');
const db = require('../db');
const { requireRole } = require('../auth');
const { notifyUsers, allMembers } = require('../notify');

const router = express.Router();

router.get('/', async (req, res) => {
  res.json(await db.query('SELECT * FROM notices WHERE society_id = $1 ORDER BY id DESC', [req.society.id]));
});

// POST /api/notices { title, body, important }
router.post('/', requireRole('secretary'), async (req, res) => {
  const { title, body, important } = req.body || {};
  if (!title || !body) return res.status(400).json({ message: 'Title and message are required' });

  const notice = await db.one(
    `INSERT INTO notices (society_id, title, body, important, posted_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.society.id, String(title).trim(), String(body).trim(), Boolean(important), req.user.name]
  );
  const others = (await allMembers(req.society.id)).filter((id) => id !== req.user.id);
  await notifyUsers(others, `${notice.important ? '📢 Important: ' : 'Notice: '}${notice.title}`, notice.body.slice(0, 120), {
    societyId: req.society.id, url: '/notices',
  });
  res.status(201).json(notice);
});

router.delete('/:id', requireRole('secretary'), async (req, res) => {
  const deleted = await db.one('DELETE FROM notices WHERE id = $1 AND society_id = $2 RETURNING id', [Number(req.params.id), req.society.id]);
  if (!deleted) return res.status(404).json({ message: 'Notice not found' });
  res.json({ ok: true });
});

module.exports = router;
