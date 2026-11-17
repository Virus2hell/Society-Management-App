// Random 6-digit codes (society join codes, guest gate-pass codes).
const crypto = require('crypto');
const db = require('./db');

// Picks a 6-digit code that is not used yet in the given table
async function uniqueCode(table) {
  for (let i = 0; i < 20; i++) {
    const code = String(crypto.randomInt(100000, 1000000));
    const taken = await db.one(`SELECT 1 FROM ${table} WHERE code = $1`, [code]);
    if (!taken) return code;
  }
  throw new Error('Could not generate a unique code, please try again');
}

module.exports = { uniqueCode };
