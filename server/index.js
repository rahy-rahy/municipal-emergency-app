'use strict';

const path = require('path');
const express = require('express');
const compression = require('compression');

const config = require('./config');
const auth = require('./auth');
const { runMigrations } = require('./db/migrate');
const { seedIfEmpty } = require('./seed');
const {
  securityHeaders,
  sessionMiddleware,
  csrfProtection,
  apiLimiter
} = require('./security');

const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const { router: reportRoutes } = require('./routes/reports');
const staffRoutes = require('./routes/staff');
const adminRoutes = require('./routes/admin');

const app = express();
app.disable('x-powered-by');

// Behind a hosting proxy the real client ip comes from a header.
// One hop is trusted so rate limits and audit ips are correct.
app.set('trust proxy', 1);

app.use(securityHeaders());
app.use(compression());
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use(sessionMiddleware());
app.use(auth.loadUser);
app.use(csrfProtection());

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const VIEWS_DIR = path.join(__dirname, '..', 'views');

function sendView(res, name) {
  res.sendFile(path.join(VIEWS_DIR, name));
}

// Where to send a signed in user based on role.
function dashboardFor(user) {
  if (!user) return '/';
  if (user.role === 'admin') return '/admin';
  if (user.role === 'support') return '/staff';
  return '/app';
}

// Public pages. A signed in user landing on the login page is moved to
// their dashboard.
app.get('/', (req, res) => {
  if (req.user) return res.redirect(dashboardFor(req.user));
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});
app.get('/register', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'register.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'terms.html')));
app.get('/privacy', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'privacy.html')));

// Page level guards. On failure a browser gets an html page, not JSON.
function pageAuth(req, res, next) {
  if (!req.user) return res.redirect('/');
  next();
}
function pageRole(minRole) {
  return function (req, res, next) {
    if (!req.user) return res.redirect('/');
    if (auth.RANK[req.user.role] < auth.RANK[minRole]) {
      return res.status(403).sendFile(path.join(VIEWS_DIR, '403.html'));
    }
    next();
  };
}

// Protected page shells. Served only after the role check passes, so a
// direct request without access never receives the html.
app.get('/app', pageAuth, (req, res) => sendView(res, 'app.html'));
app.get('/staff', pageAuth, pageRole('support'), (req, res) => sendView(res, 'staff.html'));
app.get('/admin', pageAuth, pageRole('admin'), (req, res) => sendView(res, 'admin.html'));

// Email verification link is a plain browser GET at the site root.
app.get('/verify', authRoutes.verifyHandler);

// API surface. Rate limited as a whole.
app.use('/api', apiLimiter);
app.use('/api', authRoutes);
app.use('/api', publicRoutes);
app.use('/api', reportRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);

// Static assets last, so protected routes always win. Only the public
// folder is exposed. The data folder with uploads is never static.
app.use(express.static(PUBLIC_DIR, {
  index: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Unknown API path.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Everything else shows the friendly 404 page.
app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

// Central error handler. Multer and other thrown errors land here.
// The real detail is logged. The client gets a short safe message.
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large.' });
  }
  if (err && /Only JPG|Only image/i.test(err.message || '')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled error:', err && err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

async function start() {
  try {
    await runMigrations();
    await seedIfEmpty();
  } catch (err) {
    console.error('\nStartup failed. Could not prepare the database.');
    console.error(err.message);
    console.error('\nCheck that PostgreSQL is running and the connection settings are correct.');
    process.exit(1);
  }

  app.listen(config.port, () => {
    const url = 'http://localhost:' + config.port;
    console.log('');
    console.log('Municipal Emergency Reporting App');
    console.log('Server running. Open this address in your browser:');
    console.log('  ' + url);
    console.log('');
    if (config.demoMode) {
      console.log('Demo mode is ON. Quick login buttons are on the sign in page.');
      console.log('All demo accounts use the password: demo1234');
    } else {
      console.log('Demo mode is OFF.');
    }
    console.log('');
  });
}

start();

module.exports = app;
