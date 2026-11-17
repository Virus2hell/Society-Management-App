// /api/notifications — in-app notification feed (the app polls this).
const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/notifications?after=12 — only items newer than id 12
router.get('/', async (req, res) => {
  res.json(
    await db.query('SELECT * FROM notifications WHERE user_id = $1 AND id > $2 ORDER BY id DESC LIMIT 50', [
      req.user.id,
      Number(req.query.after) || 0,
    ])
  );
});

// POST /api/notifications/read-all
router.post('/read-all', async (req, res) => {
  await db.query('UPDATE notifications SET read = true WHERE user_id = $1 AND read = false', [req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
