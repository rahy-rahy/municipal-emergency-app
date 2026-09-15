'use strict';

// Loads settings from the environment. Never put secrets in code.
// In development a .env file is loaded. In production the host provides
// the variables directly.
require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error('Missing required environment variable: ' + name);
  }
  return value;
}

function bool(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return String(value).toLowerCase() === 'true' || value === '1';
}

function int(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

const config = {
  env,
  isProd,
  port: int('PORT', 3000),

  // Postgres connection. Either a full URL or the discrete parts.
  databaseUrl: process.env.DATABASE_URL || null,
  db: {
    host: process.env.PGHOST || '127.0.0.1',
    port: int('PGPORT', 5432),
    user: process.env.PGUSER || 'mera_app',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'mera',
    ssl: bool('PGSSL', false)
  },

  // Session signing secret. Must be long and random in production.
  sessionSecret: isProd
    ? required('SESSION_SECRET')
    : (process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me'),

  // Cookie is sent only over HTTPS in production.
  cookieSecure: bool('COOKIE_SECURE', isProd),
  sessionMaxAgeHours: int('SESSION_MAX_AGE_HOURS', 12),

  // Demo mode enables the quick login buttons and seed reset endpoint.
  // Turn this OFF for real deployments.
  demoMode: bool('DEMO_MODE', !isProd),

  // Town center used for the map and proximity checks.
  town: {
    name: process.env.TOWN_NAME || 'Sakiet El Misk and Bhersaf',
    lat: parseFloat(process.env.TOWN_LAT || '33.9086'),
    lng: parseFloat(process.env.TOWN_LNG || '35.6531')
  },

  // Emergency fallback numbers shown in the app.
  emergencyNumbers: {
    civilDefense: process.env.NUM_CIVIL_DEFENSE || '125',
    redCross: process.env.NUM_RED_CROSS || '140',
    police: process.env.NUM_POLICE || '112'
  },

  // The town emergency contact. Tapping the call button dials this
  // number from the person's own phone.
  emergencyContact: {
    name: process.env.EMERGENCY_CONTACT_NAME || 'Town emergency line',
    number: process.env.EMERGENCY_CONTACT_NUMBER || '03804326'
  },

  // Suggested role by email domain. This is a hint for reviewers only.
  // The server NEVER grants a role from the email a user types at sign up.
  domainRoleMap: {
    'admin.metn.gov.lb': 'admin',
    'staff.metn.gov.lb': 'support'
  },

  // Upload limits.
  maxPhotoBytes: int('MAX_PHOTO_BYTES', 4 * 1024 * 1024),

  // Email for verification links. If not set, the app runs in
  // console mode and prints the link to the server log.
  mail: {
    enabled: bool('MAIL_ENABLED', false),
    host: process.env.SMTP_HOST || '',
    port: int('SMTP_PORT', 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'no-reply@example.com'
  },

  // Public base URL used when building verification links.
  baseUrl: process.env.BASE_URL || null
};

// A reviewer hint only. Returns a suggested role or resident.
config.suggestRoleForEmail = function (email) {
  if (!email || email.indexOf('@') === -1) return 'resident';
  const domain = email.split('@')[1].toLowerCase();
  return config.domainRoleMap[domain] || 'resident';
};

module.exports = config;
