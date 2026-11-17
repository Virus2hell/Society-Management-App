// Demo data so you (or an interviewer) can try the app immediately:
//   - society "Shanti Kunj CHS" with join code 123456
//   - secretary, watchman, two residents (approved) + one PENDING request (Amit)
// All demo passwords: 123456.
//
//   npm run seed   -> wipes ALL data and inserts the demo data again
// The server also inserts it automatically when the database is empty
// (set SEED_DEMO=false to turn that off).
require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const db = require('./db');
const { generateFlats } = require('./flats');

async function insertDemoData() {
  const hash = bcrypt.hashSync('123456', 10);
  const flats = generateFlats({ wings: 'A,B', floors: 2, flatsPerFloor: 2 });
  const month = new Date().toISOString().slice(0, 7);
  const due = new Date();
  due.setDate(due.getDate() + 10);
  const dueDate = due.toISOString().slice(0, 10);

  await db.tx(async (c) => {
    const people = [
      ['Mr. Sharma', 'secretary@demo.com'],
      ['Ramesh Yadav', 'watchman@demo.com'],
      ['Priya Patil', 'priya@demo.com'],
      ['Rahul Mehta', 'rahul@demo.com'],
      ['Amit Shah', 'amit@demo.com'],
    ];
    const ids = {};
    for (const [name, email] of people) {
      const u = await db.one(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
        [name, email, hash], c
      );
      ids[email] = u.id;
    }

    const society = await db.one(
      `INSERT INTO societies (name, address, city, code, flats, created_by)
       VALUES ('Shanti Kunj CHS', 'Sakinaka, Andheri East', 'Mumbai', '123456', $1, $2) RETURNING id`,
      [flats, ids['secretary@demo.com']], c
    );
    const sid = society.id;
    const secretaryId = ids['secretary@demo.com'];

    const members = [
      ['secretary@demo.com', 'secretary', null, 'approved'],
      ['watchman@demo.com', 'watchman', null, 'approved'],
      ['priya@demo.com', 'resident', 'A-102', 'approved'],
      ['rahul@demo.com', 'resident', 'B-201', 'approved'],
      ['amit@demo.com', 'resident', 'A-201', 'pending'],
    ];
    for (const [email, role, flat, status] of members) {
      await c.query(
        `INSERT INTO memberships (user_id, society_id, role, flat, status, decided_at, decided_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [ids[email], sid, role, flat, status, status === 'approved' ? new Date() : null, status === 'approved' ? secretaryId : null]
      );
    }

    for (const flat of flats) {
      const paid = flat === 'B-201';
      await c.query(
        `INSERT INTO bills (society_id, flat, month, amount, due_date, status, paid_at, payment_method, payment_ref)
         VALUES ($1, $2, $3, 2500, $4, $5, $6, $7, $8)`,
        [sid, flat, month, dueDate, paid ? 'paid' : 'unpaid', paid ? new Date() : null, paid ? 'UPI' : null, paid ? 'TXN100001' : null]
      );
    }

    await c.query(
      `INSERT INTO notices (society_id, title, body, important, posted_by) VALUES ($1, $2, $3, true, 'Mr. Sharma')`,
      [sid, 'Water tank cleaning on Sunday', 'Water supply will be off from 10 AM to 2 PM this Sunday for tank cleaning. Please store water in advance.']
    );
  });
}

// Called on server start: only seeds a completely empty database
async function seedIfEmpty() {
  if (process.env.SEED_DEMO === 'false') return;
  const { count } = await db.one('SELECT count(*)::int AS count FROM users');
  if (count === 0) {
    await insertDemoData();
    console.log('Empty database: inserted demo data (join code 123456, password 123456).');
  }
}

async function resetAndSeed() {
  await db.migrate();
  await db.query(`TRUNCATE users, societies, memberships, visitors, bills, complaints, notices, notifications, photos
                  RESTART IDENTITY CASCADE`);
  await insertDemoData();
}

module.exports = { seedIfEmpty };

if (require.main === module) {
  resetAndSeed()
    .then(() => {
      console.log('Database reset with demo data. Join code: 123456, password for demo users: 123456');
      return db.close();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
