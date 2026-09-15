'use strict';

const crypto = require('crypto');
const db = require('./db/pool');

// A random url safe token, used for email verification links.
function randomToken(bytes) {
  return crypto.randomBytes(bytes || 32).toString('base64url');
}

// Hash a token before storing it, so the database never holds the raw value.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Write a row to the audit trail. Never throws into the request path.
async function audit(actorId, action, detail, ip) {
  try {
    await db.query(
      'INSERT INTO audit_log (actor_id, action, detail, ip) VALUES ($1, $2, $3, $4)',
      [actorId || null, action, detail || {}, ip || null]
    );
  } catch (err) {
    console.error('Audit write failed:', err.message);
  }
}

// Distance in kilometers between two points, haversine formula.
function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Client ip from the request, honoring a trusted proxy header.
function clientIp(req) {
  return (
    req.ip ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket.remoteAddress ||
    null
  );
}

module.exports = { randomToken, hashToken, audit, distanceKm, clientIp };
