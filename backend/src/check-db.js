// Diagnoses database connection problems step by step:
//   npm run check-db
// 1. Is DATABASE_URL set and well-formed?
// 2. Can your normal network (router / ISP DNS) find the host?
// 3. Can public DNS (Google 8.8.8.8 / Cloudflare 1.1.1.1) find it?
// 4. Can we log in and run a query?
require('dotenv').config({ quiet: true });
const dns = require('dns');

const resolverServers = () =>
  process.env.DATABASE_DNS_SERVERS ? process.env.DATABASE_DNS_SERVERS.split(',') : ['8.8.8.8', '1.1.1.1'];
const ok = (msg) => console.log(`  ✅ ${msg}`);
const bad = (msg) => console.log(`  ❌ ${msg}`);
const tip = (msg) => console.log(`     👉 ${msg}`);

async function main() {
  console.log('\nChecking your database connection...\n');

  // 1. The connection string
  const raw = String(process.env.DATABASE_URL || '').trim().replace(/^['"]|['"]$/g, '');
  if (!raw) {
    bad('DATABASE_URL is empty.');
    tip('Create backend/.env from .env.example and paste your Neon connection string.');
    return;
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    bad('DATABASE_URL is not a valid URL.');
    tip('It must start with postgresql:// . Copy it again from Neon -> Connect.');
    return;
  }
  const host = url.hostname;
  ok(`DATABASE_URL found. Host: ${host}  Database: ${url.pathname.slice(1) || '(none)'}  User: ${url.username || '(none)'}`);
  const isLocal = ['localhost', '127.0.0.1'].includes(host);
  if (!url.password && !isLocal) bad('There is no password in the URL. Copy the full string from Neon (click "Show password").');

  // 2. Normal DNS (what Node and your apps use)
  let systemOk = false;
  try {
    const { address } = await dns.promises.lookup(host);
    systemOk = true;
    ok(`Your network found the host -> ${address}`);
  } catch (e) {
    bad(`Your network could NOT find the host (${e.code}).`);
  }

  // 3. Public DNS (skipped for a database on this computer)
  let publicOk = false;
  if (!isLocal) try {
    const resolver = new dns.promises.Resolver({ timeout: 5000, tries: 2 });
    resolver.setServers(resolverServers());
    const ips = await resolver.resolve4(host);
    publicOk = true;
    ok(`Public DNS (Google/Cloudflare) found the host -> ${ips[0]}`);
  } catch (e) {
    bad(`Public DNS could not find the host either (${e.code}).`);
  }

  if (!systemOk && publicOk) {
    console.log('\n  ℹ️  Your Wi-Fi/ISP DNS cannot find the host, but public DNS can.');
    console.log('     The server handles this automatically (it asks public DNS). Testing login...\n');
  }
  if (!systemOk && !publicOk) {
    console.log('\n➡️  Nobody can find this host. Most likely the connection string is wrong or incomplete.');
    tip('Open Neon -> your project -> Connect, click Copy, and paste the WHOLE string into backend/.env.');
    tip('Check the project still exists in Neon (and the branch/compute was not deleted).');
    tip('If you are on college/office Wi-Fi, also try your phone\'s hotspot.');
    return;
  }

  // 4. Real connection
  const db = require('./db');
  try {
    const row = await db.one('SELECT version() AS version, current_database() AS database');
    ok(`Logged in to database "${row.database}"`);
    ok(row.version.split(',')[0]);
    console.log('\n🎉 Database connection works. Run "npm run dev".\n');
  } catch (e) {
    bad(`Could not log in: ${e.message} (${e.code || 'no code'})`);
    if (e.code === '28P01') tip('Wrong password. Reset it in Neon (Roles) or copy the string again.');
    else if (e.code === '3D000') tip('That database name does not exist. Use the one shown in Neon -> Connect.');
    else if (['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET'].includes(e.code)) {
      tip('Your network blocks port 5432 (common on college/office Wi-Fi). Try your phone\'s hotspot.');
    } else if (/certificate/i.test(e.message)) tip('Add DATABASE_SSL_NO_VERIFY=true to backend/.env (Supabase).');
  } finally {
    await db.close();
  }
}

main();
