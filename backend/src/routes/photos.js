// /api/photos/:id — serves complaint photos stored in the database.
// Public on purpose so <Image> can load it; the id is 32 random hex
// characters, so it cannot be guessed.
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/:id', async (req, res) => {
  if (!/^[a-f0-9]{32}$/.test(req.params.id)) return res.status(404).end();
  const photo = await db.one('SELECT mime, data FROM photos WHERE id = $1', [req.params.id]);
  if (!photo) return res.status(404).end();
  res.set('Content-Type', photo.mime);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(photo.data);
});

module.exports = router;
