'use strict';

const bcrypt = require('bcryptjs');
const db = require('./db/pool');

const ROLES = ['resident', 'support', 'admin'];
const RANK = { resident: 1, support: 2, admin: 3 };

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

async function verifyPassword(plain, hash) {
  try {
    return await bcrypt.compare(plain, hash);
  } catch (_) {
    return false;
  }
}

async function findById(id) {
  if (!id) return null;
  return db.one('SELECT * FROM users WHERE id = $1', [id]);
}

async function findByEmail(email) {
  if (!email) return null;
  return db.one('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
}

// The safe shape of a user to send to the browser. No password hash.
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    phone: u.phone || null,
    role: u.role,
    status: u.status,
    emailVerified: u.email_verified,
    isDemo: u.is_demo,
    createdAt: u.created_at
  };
}

// Loads the signed in user onto req.user for every request.
async function loadUser(req, res, next) {
  try {
    if (req.session && req.session.userId) {
      req.user = await findById(req.session.userId);
      // If the account vanished, clear the stale session.
      if (!req.user) {
        req.session.destroy(() => {});
      }
    }
  } catch (err) {
    console.error('loadUser failed:', err.message);
  }
  next();
}

// Requires any signed in user.
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  if (req.user.is_blocked) return res.status(403).json({ error: 'Your account has been suspended.' });
  next();
}

// Requires a minimum role. Server side check on every protected call.
function requireRole(minRole) {
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
    if (RANK[req.user.role] < RANK[minRole]) {
      return res.status(403).json({ error: 'You do not have access to this.' });
    }
    next();
  };
}

// Requires a verified account for actions that need a confirmed identity.
function requireVerified(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  if (req.user.status !== 'verified') {
    return res.status(403).json({ error: 'Your account is not verified yet.' });
  }
  next();
}

module.exports = {
  ROLES,
  RANK,
  hashPassword,
  verifyPassword,
  findById,
  findByEmail,
  publicUser,
  loadUser,
  requireAuth,
  requireRole,
  requireVerified
};
