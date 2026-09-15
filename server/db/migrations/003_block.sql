-- Lets an admin block or freeze a suspicious account.

ALTER TABLE users ADD COLUMN is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
