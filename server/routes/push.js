'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const auth = require('../auth');

// Save a device token for the signed in user, so push can reach them.
router.post('/register', auth.requireAuth, async (req, res) => {
  var token = req.body && req.body.token;
  var platform = (req.body && req.body.platform) || 'android';
  if (!token || typeof token !== 'string' || token.length > 4096) {
    return res.status(400).json({ error: 'A valid token is required.' });
  }
  try {
    await db.query(
      `INSERT INTO device_tokens (user_id, token, platform)
       VALUES ($1, $2, $3)
       ON CONFLICT (token)
       DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, updated_at = now()`,
      [req.user.id, token, platform]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('token register failed:', err.message);
    res.status(500).json({ error: 'Could not save the token.' });
  }
});

// Remove a token, for example on sign out.
router.post('/unregister', auth.requireAuth, async (req, res) => {
  var token = req.body && req.body.token;
  if (!token) return res.json({ ok: true });
  try { await db.query('DELETE FROM device_tokens WHERE token = $1', [token]); } catch (e) {}
  res.json({ ok: true });
});

module.exports = router;
