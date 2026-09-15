'use strict';

const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('../db/pool');
const auth = require('../auth');
const config = require('../config');
const { uploadsDir } = require('../uploads');
const { audit, clientIp } = require('../util');
const { shape } = require('./reports');
const { validate, reportStatusSchema, statusChangeSchema } = require('../validation');

// Everything here needs at least the support role.
router.use(auth.requireAuth, auth.requireRole('support'));

// Incident queue. All reports with reporter name, newest first.
router.get('/incidents', async (req, res) => {
  const rows = await db.many(
    `SELECT r.*, u.full_name AS reporter_name, u.phone AS reporter_phone
     FROM reports r JOIN users u ON u.id = r.reporter_id
     ORDER BY r.created_at DESC LIMIT 300`
  );
  res.json({
    incidents: rows.map((r) => Object.assign(shape(r), {
      reporterName: r.reporter_name,
      reporterPhone: r.reporter_phone
    }))
  });
});

// Change the status of a report.
router.post('/incidents/:id/status', async (req, res) => {
  const check = validate(reportStatusSchema, req.body);
  if (!check.ok) return res.status(400).json({ error: check.error });
  const row = await db.one(
    `UPDATE reports SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [check.data.status, req.params.id]
  );
  if (!row) return res.status(404).json({ error: 'Report not found.' });
  await audit(req.user.id, 'incident.status', { id: row.id, status: check.data.status }, clientIp(req));
  res.json({ ok: true, report: shape(row) });
});

// People waiting for account verification.
router.get('/pending-users', async (req, res) => {
  const rows = await db.many(
    `SELECT id, email, full_name, phone, email_verified, created_at
     FROM users WHERE status = 'pending' ORDER BY created_at ASC`
  );
  res.json({
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      phone: u.phone,
      emailVerified: u.email_verified,
      suggestedRole: config.suggestRoleForEmail(u.email),
      createdAt: u.created_at
    }))
  });
});

// The identity documents a user uploaded, listed for review.
router.get('/users/:id/documents', async (req, res) => {
  const rows = await db.many(
    'SELECT id, kind, created_at FROM id_documents WHERE user_id = $1 ORDER BY created_at',
    [req.params.id]
  );
  res.json({ documents: rows });
});

// Serve one identity document image to a reviewer.
router.get('/documents/:docId/file', async (req, res) => {
  const row = await db.one('SELECT file_path FROM id_documents WHERE id = $1', [req.params.docId]);
  if (!row) return res.status(404).json({ error: 'Not found.' });
  res.sendFile(path.join(uploadsDir, row.file_path));
});

// Approve or reject an account. Support can set verified or rejected.
router.post('/users/:id/status', async (req, res) => {
  const check = validate(statusChangeSchema, req.body);
  if (!check.ok) return res.status(400).json({ error: check.error });
  const row = await db.one(
    'UPDATE users SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, status',
    [check.data.status, req.params.id]
  );
  if (!row) return res.status(404).json({ error: 'User not found.' });
  await audit(req.user.id, 'user.status', { id: row.id, status: check.data.status }, clientIp(req));
  res.json({ ok: true, id: row.id, status: row.status });
});

module.exports = router;
