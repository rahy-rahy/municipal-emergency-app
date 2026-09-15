'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const auth = require('../auth');
const config = require('../config');
const mail = require('../mail');
const { upload } = require('../uploads');
const { randomToken, hashToken, audit, clientIp } = require('../util');
const {
  validate,
  registerSchema,
  loginSchema
} = require('../validation');
const { authLimiter } = require('../security');

const VERIFY_TOKEN_HOURS = 24;

function baseUrl(req) {
  if (config.baseUrl) return config.baseUrl.replace(/\/$/, '');
  return req.protocol + '://' + req.get('host');
}

// Sign up. Always creates a resident with status pending. The email
// domain never grants a role. Optional ID images are stored privately.
router.post('/register', authLimiter, upload.fields([
  { name: 'idFront', maxCount: 1 },
  { name: 'idBack', maxCount: 1 },
  { name: 'selfie', maxCount: 1 }
]), async (req, res) => {
  const check = validate(registerSchema, req.body);
  if (!check.ok) return res.status(400).json({ error: check.error });
  const { email, password, fullName, phone } = check.data;

  const existing = await auth.findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await auth.hashPassword(password);

  try {
    const result = await db.tx(async (client) => {
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone, role, status, email_verified)
         VALUES ($1, $2, $3, $4, 'resident', 'pending', FALSE)
         RETURNING *`,
        [email, passwordHash, fullName, phone || null]
      );
      const user = userRes.rows[0];

      // Store any uploaded identity files.
      const files = req.files || {};
      const kinds = [
        ['idFront', 'id_front'],
        ['idBack', 'id_back'],
        ['selfie', 'selfie']
      ];
      for (const [field, kind] of kinds) {
        const f = files[field] && files[field][0];
        if (f) {
          await client.query(
            'INSERT INTO id_documents (user_id, kind, file_path) VALUES ($1, $2, $3)',
            [user.id, kind, f.filename]
          );
        }
      }

      // Create the email verification token.
      const token = randomToken(32);
      const expires = new Date(Date.now() + VERIFY_TOKEN_HOURS * 3600 * 1000);
      await client.query(
        `INSERT INTO email_tokens (user_id, token_hash, purpose, expires_at)
         VALUES ($1, $2, 'verify_email', $3)`,
        [user.id, hashToken(token), expires]
      );
      return { user, token };
    });

    const link = baseUrl(req) + '/verify?token=' + result.token;
    const mailResult = await mail.sendVerificationEmail(email, link);
    await audit(result.user.id, 'user.register', { email }, clientIp(req));

    return res.status(201).json({
      ok: true,
      message: 'Account created. Check your email to confirm it.',
      // In demo mode the link is returned so testing needs no mail server.
      verifyLink: config.demoMode ? link : undefined,
      emailDelivered: mailResult.delivered
    });
  } catch (err) {
    console.error('register failed:', err.message);
    return res.status(500).json({ error: 'Could not create the account.' });
  }
});

// Confirm an email using the token from the link.
async function verifyHandler(req, res) {
  const token = String(req.query.token || '');
  if (!token) return res.redirect('/?verify=missing');

  const row = await db.one(
    `SELECT * FROM email_tokens
     WHERE token_hash = $1 AND purpose = 'verify_email'`,
    [hashToken(token)]
  );
  if (!row || row.used_at || new Date(row.expires_at) < new Date()) {
    return res.redirect('/?verify=invalid');
  }

  await db.tx(async (client) => {
    await client.query('UPDATE email_tokens SET used_at = now() WHERE id = $1', [row.id]);
    await client.query('UPDATE users SET email_verified = TRUE, updated_at = now() WHERE id = $1', [row.user_id]);
  });
  await audit(row.user_id, 'user.email_verified', {}, clientIp(req));

  return res.redirect('/?verify=ok');
}
router.get('/verify', verifyHandler);

// Sign in. Same error message for wrong email or wrong password so an
// attacker cannot tell which accounts exist.
router.post('/login', authLimiter, async (req, res) => {
  const check = validate(loginSchema, req.body);
  if (!check.ok) return res.status(400).json({ error: check.error });
  const { email, password } = check.data;

  const user = await auth.findByEmail(email);
  const ok = user && (await auth.verifyPassword(password, user.password_hash));
  if (!ok) {
    await audit(user ? user.id : null, 'auth.login_failed', { email }, clientIp(req));
    return res.status(401).json({ error: 'Wrong email or password.' });
  }
  if (user.is_blocked) {
    await audit(user.id, 'auth.login_blocked', {}, clientIp(req));
    return res.status(403).json({ error: 'Your account has been suspended. Contact the municipality.' });
  }

  req.session.userId = user.id;
  await audit(user.id, 'auth.login', {}, clientIp(req));
  return res.json({ ok: true, user: auth.publicUser(user) });
});

// Demo quick login. Only works when demo mode is on.
router.post('/quick-login', authLimiter, async (req, res) => {
  if (!config.demoMode) return res.status(403).json({ error: 'Quick login is disabled.' });
  const map = {
    admin: 'admin@admin.metn.gov.lb',
    support: 'support@staff.metn.gov.lb',
    resident: 'resident@example.com',
    pending: 'pending@example.com'
  };
  const email = map[req.body && req.body.role];
  if (!email) return res.status(400).json({ error: 'Unknown demo role.' });

  const user = await auth.findByEmail(email);
  if (!user) return res.status(404).json({ error: 'Demo account not found. Seed the database.' });

  req.session.userId = user.id;
  await audit(user.id, 'auth.quick_login', { role: req.body.role }, clientIp(req));
  return res.json({ ok: true, user: auth.publicUser(user) });
});

router.post('/logout', (req, res) => {
  const id = req.session ? req.session.userId : null;
  req.session.destroy(() => {
    res.clearCookie('mera.sid');
    audit(id, 'auth.logout', {}, clientIp(req));
    res.json({ ok: true });
  });
});

// The current signed in user, or null.
router.get('/me', (req, res) => {
  res.json({ user: auth.publicUser(req.user) });
});

module.exports = router;
module.exports.verifyHandler = verifyHandler;
