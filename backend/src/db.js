// PostgreSQL connection + tiny helpers used by all routes.
//
//   await db.query('SELECT * FROM bills WHERE society_id = $1', [id])  -> array of rows
//   await db.one('SELECT ...', [...])                                    -> first row or null
//   await db.tx(async (client) => { ... })                               -> transaction
//
// Column names are snake_case in SQL (society_id) and are converted to
// camelCase (societyId) for the app, so the JSON looks the same as before.
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const { Pool, types } = require('pg');

// Return DATE columns as plain 'YYYY-MM-DD' strings (not JS Date objects,
// which would shift by timezone).
types.setTypeParser(1082, (value) => value);

// Removes SSL options from the URL (sslmode=require, channel_binding=...) because
// SSL is configured below in code. This also avoids pg's "SSL modes" warning.
function cleanConnectionString(raw) {
  const value = String(raw || '').trim().replace(/^['"]|['"]$/g, '');
  try {
    const url = new URL(value);
    ['sslmode', 'channel_binding', 'uselibpqcompat', 'sslrootcert'].forEach((key) => url.searchParams.delete(key));
    return url.toString();
  } catch {
    return value;
  }
}

const connectionString = cleanConnectionString(process.env.DATABASE_URL);
if (!connectionString) {
  console.error('\n❌ DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in.\n');
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
const sslConfig = isLocal ? false : { rejectUnauthorized: process.env.DATABASE_SSL_NO_VERIFY !== 'true' };

// Public DNS servers used when the computer's own DNS can't find the database
// host (some Wi-Fi routers / ISPs fail to resolve *.neon.tech).
const PUBLIC_DNS = process.env.DATABASE_DNS_SERVERS ? process.env.DATABASE_DNS_SERVERS.split(',') : ['8.8.8.8', '1.1.1.1'];

// Returns the pg config. Normally just the connection string. If the system DNS
// cannot find the host, we ask public DNS for its IP, connect to that IP and keep
// the real hostname for TLS (SNI + certificate check), so security is unchanged.
async function buildConfig(resolveWith = PUBLIC_DNS) {
  const config = { connectionString, ssl: sslConfig, max: 10 };
  if (isLocal) return config;

  const url = new URL(connectionString);
  const host = url.hostname;
  try {
    await dns.promises.lookup(host);
    return config; // normal case: DNS works
  } catch (err) {
    if (!['ENOTFOUND', 'EAI_AGAIN', 'ESERVFAIL'].includes(err.code)) throw err;
  }

  const resolver = new dns.promises.Resolver({ timeout: 5000, tries: 2 });
  resolver.setServers(resolveWith);
  const [ip] = await resolver.resolve4(host); // throws ENOTFOUND if nobody knows the host
  console.warn(`⚠️  Your network's DNS could not find ${host}.`);
  console.warn(`   Using public DNS instead -> ${ip} (TLS still verifies ${host}).`);

  url.hostname = ip; // the connection string's host wins in pg, so replace it there
  return {
    ...config,
    connectionString: url.toString(),
    ssl: sslConfig && { ...sslConfig, servername: host },
  };
}

// The pool is created on first use (after the DNS check above)
let poolPromise = null;
function getPool() {
  if (!poolPromise) poolPromise = buildConfig().then((config) => new Pool(config));
  return poolPromise;
}

async function close() {
  if (poolPromise) await (await getPool()).end();
}

const toCamel = (key) => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
function camelRow(row) {
  const out = {};
  for (const key of Object.keys(row)) out[toCamel(key)] = row[key];
  return out;
}

async function query(text, params = [], client) {
  const result = await (client || (await getPool())).query(text, params);
  return result.rows.map(camelRow);
}

async function one(text, params = [], client) {
  const rows = await query(text, params, client);
  return rows[0] || null;
}

// Runs fn(client) inside BEGIN/COMMIT, rolls back on error
async function tx(fn) {
  const client = await (await getPool()).connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Creates the tables if they don't exist yet
async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await (await getPool()).query(sql);
}

module.exports = { query, one, tx, migrate, close, buildConfig, connectionString };
