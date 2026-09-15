'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const auth = require('../auth');
const config = require('../config');
const { audit, clientIp } = require('../util');
const { validate, broadcastSchema, roleChangeSchema } = require('../validation');

// Everything here needs the admin role.
router.use(auth.requireAuth, auth.requireRole('admin'));

// All accounts.
router.get('/users', async (req, res) => {
  const rows = await db.many(
    `SELECT id, email, full_name, phone, role, status, email_verified, is_demo, created_at
     FROM users ORDER BY created_at DESC`
  );
  res.json({
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      phone: u.phone,
      role: u.role,
      status: u.status,
      emailVerified: u.email_verified,
      isDemo: u.is_demo,
      createdAt: u.created_at
    }))
  });
});

// Change a role. This is the only path that grants support or admin.
// An admin cannot remove their own admin role, to avoid lockout.
router.post('/users/:id/role', async (req, res) => {
  const check = validate(roleChangeSchema, req.body);
  if (!check.ok) return res.status(400).json({ error: check.error });
  if (req.params.id === req.user.id && check.data.role !== 'admin') {
    return res.status(400).json({ error: 'You cannot lower your own admin role.' });
  }
  const row = await db.one(
    'UPDATE users SET role = $1, updated_at = now() WHERE id = $2 RETURNING id, role',
    [check.data.role, req.params.id]
  );
  if (!row) return res.status(404).json({ error: 'User not found.' });
  await audit(req.user.id, 'user.role', { id: row.id, role: check.data.role }, clientIp(req));
  res.json({ ok: true, id: row.id, role: row.role });
});

// Create a town broadcast.
router.post('/broadcasts', async (req, res) => {
  const check = validate(broadcastSchema, req.body);
  if (!check.ok) return res.status(400).json({ error: check.error });
  const d = check.data;
  const row = await db.one(
    `INSERT INTO broadcasts (admin_id, title, message, severity, lat, lng, radius_km)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.user.id, d.title, d.message, d.severity,
     d.lat != null ? d.lat : null, d.lng != null ? d.lng : null,
     d.radiusKm != null ? d.radiusKm : null]
  );
  await audit(req.user.id, 'broadcast.create', { id: row.id, severity: d.severity }, clientIp(req));
  try { require('../push').notifyResidentsOfBroadcast(row); } catch (e) {}
  res.status(201).json({ ok: true, broadcast: {
    id: row.id, title: row.title, message: row.message, severity: row.severity,
    lat: row.lat, lng: row.lng, radiusKm: row.radius_km, createdAt: row.created_at
  }});
});

// The audit trail, newest first.
router.get('/audit', async (req, res) => {
  const rows = await db.many(
    `SELECT a.id, a.action, a.detail, a.ip, a.created_at, u.full_name AS actor_name
     FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
     ORDER BY a.created_at DESC LIMIT 200`
  );
  res.json({ entries: rows });
});

// Reset the demo data. Only in demo mode. Removes demo rows and reseeds.
router.post('/demo/reset', async (req, res) => {
  if (!config.demoMode) return res.status(403).json({ error: 'Not in demo mode.' });
  const { resetDemo } = require('../seed');
  await resetDemo();
  await audit(req.user.id, 'demo.reset', {}, clientIp(req));
  res.json({ ok: true });
});

module.exports = router;
