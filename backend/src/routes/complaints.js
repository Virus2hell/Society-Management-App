// /api/complaints — residents raise tickets (with optional photo), secretary updates status.
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const db = require('../db');
const { requireRole } = require('../auth');
const { notifyUsers, usersWithRole } = require('../notify');

const router = express.Router();

const CATEGORIES = ['Lift', 'Water', 'Electricity', 'Leakage', 'Cleaning', 'Security', 'Parking', 'Other'];
const STATUSES = ['open', 'in_progress', 'resolved'];

// Photo is kept in memory, then saved into the "photos" table
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => cb(null, (file.mimetype || '').startsWith('image/')),
});

const findComplaint = (req) =>
  db.one('SELECT * FROM complaints WHERE id = $1 AND society_id = $2', [Number(req.params.id), req.society.id]);

// GET /api/complaints?status=open — resident: own flat, secretary: all
router.get('/', async (req, res) => {
  const where = ['society_id = $1'];
  const params = [req.society.id];
  if (req.membership.role === 'resident') {
    params.push(req.membership.flat);
    where.push(`flat = $${params.length}`);
  }
  if (req.query.status) {
    params.push(req.query.status);
    where.push(`status = $${params.length}`);
  }
  res.json(await db.query(`SELECT * FROM complaints WHERE ${where.join(' AND ')} ORDER BY id DESC`, params));
});

router.get('/categories', (req, res) => res.json(CATEGORIES));

// GET /api/complaints/:id
router.get('/:id', async (req, res) => {
  const complaint = await findComplaint(req);
  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
  if (req.membership.role === 'resident' && complaint.flat !== req.membership.flat) {
    return res.status(403).json({ message: 'Not your complaint' });
  }
  res.json(complaint);
});

// POST /api/complaints (multipart/form-data: title, description, category, photo?)
router.post('/', requireRole('resident'), upload.single('photo'), async (req, res) => {
  const { title, description, category } = req.body || {};
  if (!title || !description) return res.status(400).json({ message: 'Title and description are required' });

  let photoUrl = null;
  if (req.file) {
    const photoId = crypto.randomBytes(16).toString('hex');
    await db.query('INSERT INTO photos (id, mime, data) VALUES ($1, $2, $3)', [photoId, req.file.mimetype, req.file.buffer]);
    photoUrl = `/api/photos/${photoId}`;
  }

  const history = [{ status: 'open', note: 'Complaint raised', by: req.user.name, at: new Date().toISOString() }];
  const complaint = await db.one(
    `INSERT INTO complaints (society_id, title, description, category, photo_url, flat, raised_by, raised_by_name, status, history)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9) RETURNING *`,
    [req.society.id, String(title).trim(), String(description).trim(), CATEGORIES.includes(category) ? category : 'Other',
      photoUrl, req.membership.flat, req.user.id, req.user.name, JSON.stringify(history)]
  );

  await notifyUsers(await usersWithRole(req.society.id, 'secretary'), `New complaint from ${complaint.flat}`, `${complaint.category}: ${complaint.title}`, {
    societyId: req.society.id, url: `/complaint/${complaint.id}`,
  });
  res.status(201).json(complaint);
});

// PATCH /api/complaints/:id/status { status, note } — secretary
router.patch('/:id/status', requireRole('secretary'), async (req, res) => {
  const { status, note } = req.body || {};
  if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  const complaint = await findComplaint(req);
  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

  // Append one entry to the JSONB history array
  const entry = { status, note: note || '', by: req.user.name, at: new Date().toISOString() };
  const updated = await db.one(
    `UPDATE complaints SET status = $1, history = history || $2::jsonb WHERE id = $3 RETURNING *`,
    [status, JSON.stringify([entry]), complaint.id]
  );

  const label = status.replace('_', ' ');
  await notifyUsers([complaint.raisedBy], `Complaint ${label}`, `"${complaint.title}" is now ${label}${note ? ` — ${note}` : ''}`, {
    societyId: req.society.id, url: `/complaint/${complaint.id}`,
  });
  res.json(updated);
});

module.exports = router;
