// Authentication + authorization middleware.
//
//   requireAuth    -> a valid login token (JWT) is required. Sets req.user
//   requireMember  -> the user must be an APPROVED member of the society sent
//                     in the "X-Society-Id" header. Sets req.society, req.membership
//   requireRole()  -> the membership role must be one of the given roles
//
// This is what keeps each society's data separate (multi-tenancy):
// every society-scoped query filters by req.society.id.
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  JWT_SECRET is not set. Set it in your hosting dashboard!');
}

function signToken(user) {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
}

function publicUser(user) {
  const { passwordHash, pushToken, ...rest } = user;
  return rest;
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in' });
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Session expired, please log in again' });
  }
  const user = await db.one('SELECT * FROM users WHERE id = $1', [payload.id]);
  if (!user) return res.status(401).json({ message: 'User no longer exists' });
  req.user = user;
  next();
}

async function requireMember(req, res, next) {
  const societyId = Number(req.headers['x-society-id']);
  if (!Number.isInteger(societyId) || societyId <= 0) {
    return res.status(400).json({ message: 'Choose a society first', code: 'NO_SOCIETY' });
  }
  const row = await db.one(
    `SELECT m.id AS m_id, m.role, m.flat, s.*
       FROM memberships m JOIN societies s ON s.id = m.society_id
      WHERE m.user_id = $1 AND m.society_id = $2 AND m.status = 'approved'`,
    [req.user.id, societyId]
  );
  if (!row) return res.status(403).json({ message: 'You are not a member of this society', code: 'NOT_MEMBER' });

  const { mId, role, flat, ...society } = row;
  req.membership = { id: mId, role, flat, societyId };
  req.society = society;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.membership || !roles.includes(req.membership.role)) {
      return res.status(403).json({ message: 'You are not allowed to do this' });
    }
    next();
  };
}

module.exports = { signToken, publicUser, requireAuth, requireMember, requireRole };
