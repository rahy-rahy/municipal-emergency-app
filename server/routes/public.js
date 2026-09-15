'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const auth = require('../auth');
const config = require('../config');
const { shape } = require('./reports');

// Public settings the browser needs. No secrets here.
router.get('/config', (req, res) => {
  const demo = config.demoMode
    ? {
        demoPassword: 'demo1234',
        demoAccounts: [
          { role: 'admin', label: 'Admin', email: 'admin@admin.metn.gov.lb' },
          { role: 'support', label: 'Operator', email: 'support@staff.metn.gov.lb' },
          { role: 'resident', label: 'Resident', email: 'resident@example.com' },
          { role: 'pending', label: 'Pending signup', email: 'pending@example.com' }
        ]
      }
    : {};
  res.json(Object.assign({
    town: config.town,
    emergencyNumbers: config.emergencyNumbers,
    emergencyContact: config.emergencyContact,
    demoMode: config.demoMode,
    csrfToken: res.locals.csrfToken || null
  }, demo));
});

// Map points. Active incidents plus recent broadcasts with a location.
router.get('/map', auth.requireAuth, async (req, res) => {
  const reports = await db.many(
    `SELECT * FROM reports
     WHERE status <> 'resolved' AND lat IS NOT NULL AND lng IS NOT NULL
     ORDER BY created_at DESC LIMIT 200`
  );
  const broadcasts = await db.many(
    `SELECT id, title, severity, lat, lng, radius_km, created_at
     FROM broadcasts
     WHERE lat IS NOT NULL AND lng IS NOT NULL
     ORDER BY created_at DESC LIMIT 50`
  );
  res.json({
    reports: reports.map(shape),
    broadcasts: broadcasts.map((b) => ({
      id: b.id,
      title: b.title,
      severity: b.severity,
      lat: b.lat,
      lng: b.lng,
      radiusKm: b.radius_km,
      createdAt: b.created_at
    }))
  });
});

// Town feed. Recent broadcasts and a light view of recent incidents.
router.get('/feed', auth.requireAuth, async (req, res) => {
  const broadcasts = await db.many(
    `SELECT b.*, u.full_name AS admin_name
     FROM broadcasts b JOIN users u ON u.id = b.admin_id
     ORDER BY b.created_at DESC LIMIT 30`
  );
  const reports = await db.many(
    `SELECT id, type, status, created_at, need_help, is_safe
     FROM reports ORDER BY created_at DESC LIMIT 30`
  );
  res.json({
    broadcasts: broadcasts.map((b) => ({
      id: b.id,
      title: b.title,
      message: b.message,
      severity: b.severity,
      adminName: b.admin_name,
      createdAt: b.created_at
    })),
    reports: reports.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      needHelp: r.need_help,
      isSafe: r.is_safe,
      createdAt: r.created_at
    }))
  });
});

// Latest critical broadcast, used to raise the full screen alert.
router.get('/alerts/latest', auth.requireAuth, async (req, res) => {
  const row = await db.one(
    `SELECT id, title, message, severity, created_at
     FROM broadcasts
     WHERE severity = 'critical'
     ORDER BY created_at DESC LIMIT 1`
  );
  res.json({ alert: row || null });
});

module.exports = router;
