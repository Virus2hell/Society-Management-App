// /api/bills — monthly maintenance bills of the current society.
const express = require('express');
const db = require('../db');
const { requireRole } = require('../auth');
const { notifyUsers, usersOfFlat } = require('../notify');

const router = express.Router();

// GET /api/bills?month=2026-11 — resident: own flat, secretary: all flats
router.get('/', requireRole('resident', 'secretary'), async (req, res) => {
  const where = ['society_id = $1'];
  const params = [req.society.id];
  if (req.membership.role === 'resident') {
    params.push(req.membership.flat);
    where.push(`flat = $${params.length}`);
  }
  if (req.query.month) {
    params.push(req.query.month);
    where.push(`month = $${params.length}`);
  }
  res.json(await db.query(`SELECT * FROM bills WHERE ${where.join(' AND ')} ORDER BY month DESC, flat`, params));
});

// POST /api/bills/generate { month: '2026-12', amount: 2500, dueDate: '2026-12-10' } — secretary
// One bill per flat. Flats that already have a bill for that month are skipped
// (the UNIQUE constraint + ON CONFLICT DO NOTHING does that for us).
router.post('/generate', requireRole('secretary'), async (req, res) => {
  const { month, amount, dueDate } = req.body || {};
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) return res.status(400).json({ message: 'Month must look like 2026-12' });
  if (!(Number.isInteger(Number(amount)) && Number(amount) > 0)) return res.status(400).json({ message: 'Amount must be a whole number more than 0' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate || '')) return res.status(400).json({ message: 'Due date must look like 2026-12-10' });

  const created = await db.query(
    `INSERT INTO bills (society_id, flat, month, amount, due_date, status)
     SELECT $1, flat, $2, $3, $4, 'unpaid' FROM unnest($5::text[]) AS flat
     ON CONFLICT (society_id, flat, month) DO NOTHING
     RETURNING flat`,
    [req.society.id, month, Number(amount), dueDate, req.society.flats]
  );

  for (const { flat } of created) {
    await notifyUsers(await usersOfFlat(req.society.id, flat), 'New maintenance bill', `₹${amount} for ${month} is due by ${dueDate}.`, {
      societyId: req.society.id, url: '/resident/dues',
    });
  }
  res.status(201).json({ created: created.length, skipped: req.society.flats.length - created.length });
});

// POST /api/bills/:id/pay { method } — resident pays (demo payment) or secretary records cash
router.post('/:id/pay', requireRole('resident', 'secretary'), async (req, res) => {
  const bill = await db.one('SELECT * FROM bills WHERE id = $1 AND society_id = $2', [Number(req.params.id), req.society.id]);
  if (!bill) return res.status(404).json({ message: 'Bill not found' });
  if (req.membership.role === 'resident' && bill.flat !== req.membership.flat) return res.status(403).json({ message: 'Not your bill' });
  if (bill.status === 'paid') return res.status(400).json({ message: 'Bill is already paid' });

  const method = req.body?.method || (req.membership.role === 'secretary' ? 'Cash' : 'UPI');
  const updated = await db.one(
    `UPDATE bills SET status = 'paid', paid_at = now(), payment_method = $1, payment_ref = $2
      WHERE id = $3 AND status = 'unpaid' RETURNING *`,
    [method, 'TXN' + Date.now().toString().slice(-8), bill.id]
  );
  if (!updated) return res.status(400).json({ message: 'Bill is already paid' });

  if (req.membership.role === 'secretary') {
    await notifyUsers(await usersOfFlat(req.society.id, bill.flat), 'Payment recorded', `Your ${bill.month} maintenance was marked paid (${method}).`, {
      societyId: req.society.id, url: '/resident/dues',
    });
  }
  res.json(updated);
});

module.exports = router;
