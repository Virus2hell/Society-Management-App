// Entry point of the REST API. Run with `npm run dev`.
require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const os = require('os');
const db = require('./db');
const { requireAuth, requireMember } = require('./auth');
const { seedIfEmpty } = require('./seed');

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Small request logger so you can watch the app talk to the API
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path !== '/api/notifications') {
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
});

// Health check (also used by Render to know the server is up)
app.get('/', async (req, res) => {
  await db.query('SELECT 1');
  res.json({ ok: true, name: 'Society Manager API', database: 'connected' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/photos', require('./routes/photos'));
// Logged in, but not inside a society yet (create / join / leave)
app.use('/api/societies', requireAuth, require('./routes/societies'));
app.use('/api/notifications', requireAuth, require('./routes/notifications'));
// Society-scoped: needs the "X-Society-Id" header + approved membership
const member = [requireAuth, requireMember];
app.use('/api/society', member, require('./routes/society'));
app.use('/api/visitors', member, require('./routes/visitors'));
app.use('/api/bills', member, require('./routes/bills'));
app.use('/api/complaints', member, require('./routes/complaints'));
app.use('/api/notices', member, require('./routes/notices'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Any thrown error ends up here (Express 5 also catches async errors)
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'Photo is too large (max 5 MB)' });
  console.error(err);
  res.status(err.status || 500).json({ message: 'Something went wrong on the server' });
});

async function start() {
  await db.migrate(); // create tables if needed
  await seedIfEmpty(); // demo data on a fresh database
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\nSociety API running on port ${PORT} (database connected)`);
    const ips = Object.values(os.networkInterfaces()).flat()
      .filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
    ips.forEach((ip) => console.log(`  -> http://${ip}:${PORT}  (use this from your phone)`));
    console.log(`  -> http://localhost:${PORT}\n`);
  });
}

start().catch((err) => {
  console.error('\n❌ Could not start the server:', err.message);
  if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
    console.error('   Your computer could not find the database host (DNS problem).');
  } else if (err.code === '28P01') {
    console.error('   Wrong database password. Copy the connection string again from Neon.');
  } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
    console.error('   The database did not answer. Your network may block port 5432.');
  }
  console.error('   Run "npm run check-db" to find out exactly what is wrong.\n');
  process.exit(1);
});
