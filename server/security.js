'use strict';

const crypto = require('crypto');
const helmet = require('helmet');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const PgSession = require('connect-pg-simple')(session);
const { pool } = require('./db/pool');
const config = require('./config');

// Security headers. The content policy allows the app own scripts and
// styles plus the local map library and map tiles from OpenStreetMap.
function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' }
  });
}

// Server side sessions stored in Postgres so they can be revoked and
// survive restarts. The cookie holds only a signed session id.
function sessionMiddleware() {
  return session({
    store: new PgSession({
      pool,
      tableName: 'user_sessions',
      createTableIfMissing: true
    }),
    name: 'mera.sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'lax',
      maxAge: config.sessionMaxAgeHours * 60 * 60 * 1000
    }
  });
}

// A synchronizer CSRF token kept in the session. State changing
// requests must send it back in the x-csrf-token header. Safe methods
// and the login and register posts before a session exists are handled
// by issuing a token on first contact.
function csrfProtection() {
  const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
  return function (req, res, next) {
    if (!req.session) return next();
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(24).toString('base64url');
    }
    res.locals.csrfToken = req.session.csrfToken;
    if (SAFE.has(req.method)) return next();

    const sent = req.headers['x-csrf-token'] || (req.body && req.body._csrf);
    if (!sent || sent !== req.session.csrfToken) {
      return res.status(403).json({ error: 'Invalid or missing CSRF token.' });
    }
    return next();
  };
}

// General limit for the whole API.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down and try again.' }
});

// Tight limit for the sensitive auth endpoints to slow brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Wait a few minutes and try again.' }
});

module.exports = {
  securityHeaders,
  sessionMiddleware,
  csrfProtection,
  apiLimiter,
  authLimiter
};
