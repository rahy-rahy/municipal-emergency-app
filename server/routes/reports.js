'use strict';

const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('../db/pool');
const auth = require('../auth');
const { upload, uploadsDir } = require('../uploads');
const { audit, clientIp, distanceKm } = require('../util');
const { validate, reportSchema } = require('../validation');
const config = require('../config');

// Groups a new report with a recent similar one nearby, to fold
// duplicates. Same type, within 200 meters, in the last 30 minutes.
async function findDuplicateGroup(type, lat, lng) {
  if (lat == null || lng == null) return null;
  const recent = await db.many(
    `SELECT id, group_id, lat, lng FROM reports
     WHERE type = $1 AND created_at > now() - interval '30 minutes'
       AND lat IS NOT NULL AND lng IS NOT NULL`,
    [type]
  );
  for (const r of recent) {
    if (distanceKm(lat, lng, r.lat, r.lng) <= 0.2) {
      return r.group_id || r.id;
    }
  }
  return null;
}

// Submit a report. Requires a verified account.
router.post('/reports', auth.requireAuth, auth.requireVerified,
  upload.single('photo'), async (req, res) => {
    const check = validate(reportSchema, req.body);
    if (!check.ok) return res.status(400).json({ error: check.error });
    const d = check.data;

    const lat = d.lat != null ? d.lat : null;
    const lng = d.lng != null ? d.lng : null;
    const groupId = await findDuplicateGroup(d.type, lat, lng);
    const photo = req.file ? req.file.filename : null;

    try {
      const row = await db.one(
        `INSERT INTO reports
           (reporter_id, type, description, lat, lng, need_help, is_safe, photo_path, group_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'sent')
         RETURNING *`,
        [
          req.user.id, d.type, d.description || '', lat, lng,
          !!d.needHelp, !!d.isSafe, photo, groupId
        ]
      );
      await audit(req.user.id, 'report.create', { id: row.id, type: d.type }, clientIp(req));
      // Notify operators and admins, without blocking the response.
      try { require('../push').notifyStaffOfReport(row, req.user.full_name); } catch (e) {}
      return res.status(201).json({ ok: true, report: shape(row) });
    } catch (err) {
      console.error('report create failed:', err.message);
      return res.status(500).json({ error: 'Could not save the report.' });
    }
  });

// The current user own reports.
router.get('/reports/mine', auth.requireAuth, async (req, res) => {
  const rows = await db.many(
    'SELECT * FROM reports WHERE reporter_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ reports: rows.map(shape) });
});

// Photo for a report. Residents may see their own. Support and admin
// may see any. Files are served through this guard, never statically.
router.get('/reports/:id/photo', auth.requireAuth, async (req, res) => {
  const row = await db.one('SELECT reporter_id, photo_path FROM reports WHERE id = $1', [req.params.id]);
  if (!row || !row.photo_path) return res.status(404).json({ error: 'No photo.' });
  const isOwner = row.reporter_id === req.user.id;
  const isStaff = auth.RANK[req.user.role] >= auth.RANK.support;
  if (!isOwner && !isStaff) return res.status(403).json({ error: 'No access.' });
  return res.sendFile(path.join(uploadsDir, row.photo_path));
});

function shape(r) {
  return {
    id: r.id,
    type: r.type,
    description: r.description,
    status: r.status,
    lat: r.lat,
    lng: r.lng,
    needHelp: r.need_help,
    isSafe: r.is_safe,
    hasPhoto: !!r.photo_path,
    groupId: r.group_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

module.exports = { router, shape };
