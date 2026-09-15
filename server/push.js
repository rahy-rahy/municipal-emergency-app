'use strict';

// Sends push notifications through Firebase Cloud Messaging.
// Credentials are read from a file whose path is in FIREBASE_CREDENTIALS_FILE,
// which on Render is a private Secret File. If no credentials are set, the
// module runs disabled and every send is a safe no op, so the app still works.
const fs = require('fs');
const db = require('./db/pool');

let admin = null;
let enabled = false;

try {
  var credPath = process.env.FIREBASE_CREDENTIALS_FILE;
  var rawJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  var serviceAccount = null;
  if (credPath && fs.existsSync(credPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  } else if (rawJson) {
    serviceAccount = JSON.parse(rawJson);
  }
  if (serviceAccount) {
    admin = require('firebase-admin');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    enabled = true;
    console.log('Push notifications are enabled.');
  } else {
    console.log('Push notifications are off. No Firebase credentials set.');
  }
} catch (err) {
  console.error('Push setup failed, notifications disabled:', err.message);
  enabled = false;
}

// The channel a notification uses on the phone. Each channel has its own
// sound, set up in the app. Names here must match the app channels.
function channelForReport(report) {
  if (report.need_help || report.needHelp) return 'help';
  return report.type || 'other';
}

async function tokensForUsers(userIds) {
  if (!userIds || !userIds.length) return [];
  var res = await db.query(
    'SELECT token FROM device_tokens WHERE user_id = ANY($1::uuid[])',
    [userIds]
  );
  return res.rows.map(function (r) { return r.token; });
}

async function staffUserIds() {
  var res = await db.query("SELECT id FROM users WHERE role IN ('support','admin')");
  return res.rows.map(function (r) { return r.id; });
}

async function residentUserIds() {
  var res = await db.query("SELECT id FROM users WHERE status = 'verified'");
  return res.rows.map(function (r) { return r.id; });
}

// Remove tokens Firebase reports as invalid, so the table stays clean.
async function pruneTokens(tokens, responses) {
  var bad = [];
  responses.forEach(function (r, i) {
    if (!r.success && r.error) {
      var code = r.error.code || '';
      if (code.indexOf('registration-token-not-registered') !== -1 ||
          code.indexOf('invalid-argument') !== -1) {
        bad.push(tokens[i]);
      }
    }
  });
  if (bad.length) {
    try { await db.query('DELETE FROM device_tokens WHERE token = ANY($1)', [bad]); } catch (e) {}
  }
}

// Core send. Never throws into the request path.
async function sendToTokens(tokens, payload) {
  if (!enabled || !tokens.length) return;
  var message = {
    tokens: tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.data || {},
    android: {
      priority: 'high',
      notification: {
        channelId: payload.channelId || 'other',
        sound: payload.channelId || 'other',
        defaultVibrateTimings: false,
        vibrateTimingsMillis: [0, 400, 150, 400]
      }
    }
  };
  try {
    var res = await admin.messaging().sendEachForMulticast(message);
    await pruneTokens(tokens, res.responses);
  } catch (err) {
    console.error('Push send failed:', err.message);
  }
}

// Notify operators and admins about a new incident.
async function notifyStaffOfReport(report, reporterName) {
  if (!enabled) return;
  try {
    var ids = await staffUserIds();
    var tokens = await tokensForUsers(ids);
    var channel = channelForReport(report);
    var title = report.need_help ? 'Someone needs help'
      : ('New ' + (report.type || 'incident') + ' report');
    var body = (reporterName ? reporterName + ' | ' : '') +
      (report.description ? report.description : 'Tap to open the incident queue.');
    await sendToTokens(tokens, {
      title: title, body: body, channelId: channel,
      data: { kind: 'incident', reportId: String(report.id || ''), type: String(report.type || '') }
    });
  } catch (err) { console.error('notifyStaffOfReport failed:', err.message); }
}

// Notify residents about a town broadcast.
async function notifyResidentsOfBroadcast(broadcast) {
  if (!enabled) return;
  try {
    var ids = await residentUserIds();
    var tokens = await tokensForUsers(ids);
    var channel = broadcast.severity === 'critical' ? 'broadcast_critical' : 'broadcast';
    await sendToTokens(tokens, {
      title: broadcast.title, body: broadcast.message, channelId: channel,
      data: { kind: 'broadcast', severity: String(broadcast.severity || '') }
    });
  } catch (err) { console.error('notifyResidentsOfBroadcast failed:', err.message); }
}

module.exports = {
  isEnabled: function () { return enabled; },
  notifyStaffOfReport: notifyStaffOfReport,
  notifyResidentsOfBroadcast: notifyResidentsOfBroadcast
};
