-- Municipal Emergency Reporting App. Initial schema.
-- All ids are UUIDs. All timestamps are stored in UTC.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users. Self sign up always creates a resident with status pending.
-- Roles above resident are granted only by an admin, never by email text.
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  phone          TEXT,
  role           TEXT NOT NULL DEFAULT 'resident'
                   CHECK (role IN ('resident', 'support', 'admin')),
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'verified', 'rejected')),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_demo        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email is unique regardless of letter case.
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

-- Short lived tokens for email verification and password reset.
CREATE TABLE email_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  purpose     TEXT NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX email_tokens_user_idx ON email_tokens (user_id);
CREATE INDEX email_tokens_hash_idx ON email_tokens (token_hash);

-- Identity documents uploaded during sign up. In this build the files
-- are stored on the server disk under a private folder. For real use
-- move these to encrypted object storage.
CREATE TABLE id_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('id_front', 'id_back', 'selfie')),
  file_path   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX id_documents_user_idx ON id_documents (user_id);

-- Incident reports from residents.
CREATE TABLE reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL
                 CHECK (type IN ('fire','robbery','flood','electricity','medical','other')),
  description  TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'sent'
                 CHECK (status IN ('sent','received','in_progress','resolved')),
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  need_help    BOOLEAN NOT NULL DEFAULT FALSE,
  is_safe      BOOLEAN NOT NULL DEFAULT FALSE,
  photo_path   TEXT,
  group_id     UUID,
  is_demo      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reports_status_idx ON reports (status);
CREATE INDEX reports_type_idx ON reports (type);
CREATE INDEX reports_reporter_idx ON reports (reporter_id);
CREATE INDEX reports_created_idx ON reports (created_at DESC);

-- Broadcasts from admins to the town.
CREATE TABLE broadcasts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'standard'
                CHECK (severity IN ('standard','time_sensitive','critical')),
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  radius_km   DOUBLE PRECISION,
  is_demo     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX broadcasts_created_idx ON broadcasts (created_at DESC);

-- Append only audit trail of sensitive actions.
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  detail      JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_created_idx ON audit_log (created_at DESC);
