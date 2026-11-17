// /api/visitors — gate entry, approvals, pre-approved QR passes, check-in/out.
// Every query is limited to the current society (req.society.id).
//
// Status flow:
//   walk-in:      pending -> approved / denied -> inside -> exited
//   pre-approved: approved (has QR code) -> inside -> exited
const express = require('express');
const db = require('../db');
const { requireRole } = require('../auth');
const { uniqueCode } = require('../codes');
const { notifyUsers, usersOfFlat } = require('../notify');

const router = express.Router();
const today = () => new Date().toISOString().slice(0, 10);

// Finds a visitor of the current society (or null)
const findVisitor = (req) =>
  db.one('SELECT * FROM visitors WHERE id = $1 AND society_id = $2', [Number(req.params.id), req.society.id]);

// GET /api/visitors?status=pending,approved
// Residents only see visitors for their flat; watchman & secretary see all.
router.get('/', async (req, res) => {
  const where = ['society_id = $1'];
  const params = [req.society.id];
  if (req.membership.role === 'resident') {
    params.push(req.membership.flat);
    where.push(`flat = $${params.length}`);
  }
  if (req.query.status) {
    params.push(String(req.query.status).split(','));
    where.push(`status = ANY($${params.length})`);
  }
  res.json(await db.query(`SELECT * FROM visitors WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT 200`, params));
});

// GET /api/visitors/:id
router.get('/:id', async (req, res) => {
  const visitor = await findVisitor(req);
  if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
  if (req.membership.role === 'resident' && visitor.flat !== req.membership.flat) {
    return res.status(403).json({ message: 'Not your visitor' });
  }
  res.json(visitor);
});

// POST /api/visitors — watchman logs a walk-in visitor, flat gets notified
router.post('/', requireRole('watchman'), async (req, res) => {
  const { name, phone, purpose, flat } = req.body || {};
  if (!name || !flat) return res.status(400).json({ message: 'Visitor name and flat are required' });
  if (!req.society.flats.includes(flat)) return res.status(400).json({ message: 'Unknown flat' });

  const visitor = await db.one(
    `INSERT INTO visitors (society_id, name, phone, purpose, flat, type, status, valid_date, created_by)
     VALUES ($1, $2, $3, $4, $5, 'walkin', 'pending', $6, $7) RETURNING *`,
    [req.society.id, String(name).trim(), phone || '', purpose || 'Guest', flat, today(), req.user.id]
  );
  await notifyUsers(
    await usersOfFlat(req.society.id, flat),
    'Visitor at the gate',
    `${visitor.name} (${visitor.purpose}) wants to visit ${flat}. Tap to approve or deny.`,
    { societyId: req.society.id, url: '/resident/visitors', visitorId: visitor.id }
  );
  res.status(201).json(visitor);
});

// POST /api/visitors/:id/respond { decision: 'approved' | 'denied' } — resident
router.post('/:id/respond', requireRole('resident'), async (req, res) => {
  const { decision } = req.body || {};
  if (!['approved', 'denied'].includes(decision)) return res.status(400).json({ message: 'Decision must be approved or denied' });
  const visitor = await findVisitor(req);
  if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
  if (visitor.flat !== req.membership.flat) return res.status(403).json({ message: 'Not your visitor' });

  // "AND status = 'pending'" stops two family members answering at the same time
  const updated = await db.one(
    `UPDATE visitors SET status = $1, responded_by = $2 WHERE id = $3 AND status = 'pending' RETURNING *`,
    [decision, req.user.id, visitor.id]
  );
  if (!updated) return res.status(400).json({ message: `Already ${visitor.status}` });

  await notifyUsers(
    [visitor.createdBy],
    decision === 'approved' ? 'Visitor approved ✅' : 'Visitor denied ❌',
    `${visitor.name} for ${visitor.flat} was ${decision} by ${req.user.name}.`,
    { societyId: req.society.id, url: '/watchman', visitorId: visitor.id }
  );
  res.json(updated);
});

// POST /api/visitors/preapprove { name, phone, purpose, validDate } — resident creates a QR pass
router.post('/preapprove', requireRole('resident'), async (req, res) => {
  const { name, phone, purpose, validDate } = req.body || {};
  if (!name) return res.status(400).json({ message: 'Guest name is required' });
  const date = validDate || today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today()) return res.status(400).json({ message: 'Pick today or a future date' });

  const visitor = await db.one(
    `INSERT INTO visitors (society_id, name, phone, purpose, flat, type, status, code, valid_date, created_by, responded_by)
     VALUES ($1, $2, $3, $4, $5, 'preapproved', 'approved', $6, $7, $8, $8) RETURNING *`,
    [req.society.id, String(name).trim(), phone || '', purpose || 'Guest', req.membership.flat,
      await uniqueCode('visitors'), date, req.user.id]
  );
  res.status(201).json(visitor);
});

// POST /api/visitors/verify { code } — watchman scans QR / types the 6-digit code
router.post('/verify', requireRole('watchman'), async (req, res) => {
  const code = String(req.body?.code || '').trim().replace('SOCIETYPASS:', '');
  const visitor = await db.one('SELECT * FROM visitors WHERE code = $1 AND society_id = $2', [code, req.society.id]);

  if (!visitor) return res.status(404).json({ message: 'Invalid pass. No guest found for this code.' });
  if (visitor.status !== 'approved') return res.status(400).json({ message: `This pass was already used (status: ${visitor.status}).` });
  if (visitor.validDate !== today()) return res.status(400).json({ message: `This pass is valid only on ${visitor.validDate}.` });

  const updated = await db.one(
    `UPDATE visitors SET status = 'inside', entry_at = now() WHERE id = $1 AND status = 'approved' RETURNING *`,
    [visitor.id]
  );
  if (!updated) return res.status(400).json({ message: 'This pass was just used.' });
  await notifyUsers(
    await usersOfFlat(req.society.id, visitor.flat),
    'Your guest has arrived',
    `${visitor.name} entered the society using your gate pass.`,
    { societyId: req.society.id, url: '/resident/visitors', visitorId: visitor.id }
  );
  res.json(updated);
});

// POST /api/visitors/:id/checkin — watchman lets an approved walk-in inside
router.post('/:id/checkin', requireRole('watchman'), async (req, res) => {
  const updated = await db.one(
    `UPDATE visitors SET status = 'inside', entry_at = now()
      WHERE id = $1 AND society_id = $2 AND status = 'approved' RETURNING *`,
    [Number(req.params.id), req.society.id]
  );
  if (!updated) return res.status(400).json({ message: 'Only approved visitors can enter' });
  res.json(updated);
});

// POST /api/visitors/:id/checkout — watchman marks exit
router.post('/:id/checkout', requireRole('watchman'), async (req, res) => {
  const updated = await db.one(
    `UPDATE visitors SET status = 'exited', exit_at = now()
      WHERE id = $1 AND society_id = $2 AND status = 'inside' RETURNING *`,
    [Number(req.params.id), req.society.id]
  );
  if (!updated) return res.status(400).json({ message: 'Visitor is not inside' });
  res.json(updated);
});

module.exports = router;
