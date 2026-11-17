-- Database schema (PostgreSQL). Runs automatically when the server starts.
-- "IF NOT EXISTS" makes it safe to run again and again.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  push_token    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS societies (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  address    TEXT NOT NULL DEFAULT '',
  city       TEXT NOT NULL DEFAULT '',
  code       CHAR(6) NOT NULL UNIQUE,          -- 6-digit join code
  flats      TEXT[] NOT NULL,                  -- e.g. {A-101,A-102,...}
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Links a user to a society with a role. This is what makes the app multi-society.
CREATE TABLE IF NOT EXISTS memberships (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  society_id  INT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('secretary', 'resident', 'watchman')),
  flat        TEXT,
  status      TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'removed', 'left')),
  decided_at  TIMESTAMPTZ,
  decided_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, society_id)
);
CREATE INDEX IF NOT EXISTS memberships_society_idx ON memberships (society_id, status);

CREATE TABLE IF NOT EXISTS visitors (
  id           SERIAL PRIMARY KEY,
  society_id   INT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL DEFAULT '',
  purpose      TEXT NOT NULL DEFAULT 'Guest',
  flat         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('walkin', 'preapproved')),
  status       TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'inside', 'exited')),
  code         CHAR(6) UNIQUE,                 -- gate pass code (pre-approved guests)
  valid_date   DATE NOT NULL,
  created_by   INT REFERENCES users(id) ON DELETE SET NULL,
  responded_by INT REFERENCES users(id) ON DELETE SET NULL,
  entry_at     TIMESTAMPTZ,
  exit_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visitors_society_idx ON visitors (society_id, status);

CREATE TABLE IF NOT EXISTS bills (
  id             SERIAL PRIMARY KEY,
  society_id     INT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  flat           TEXT NOT NULL,
  month          CHAR(7) NOT NULL,             -- '2026-11'
  amount         INT NOT NULL CHECK (amount > 0),
  due_date       DATE NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('unpaid', 'paid')),
  paid_at        TIMESTAMPTZ,
  payment_method TEXT,
  payment_ref    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (society_id, flat, month)
);

CREATE TABLE IF NOT EXISTS complaints (
  id             SERIAL PRIMARY KEY,
  society_id     INT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  category       TEXT NOT NULL,
  photo_url      TEXT,
  flat           TEXT,
  raised_by      INT REFERENCES users(id) ON DELETE SET NULL,
  raised_by_name TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved')),
  history        JSONB NOT NULL DEFAULT '[]',  -- [{status, note, by, at}]
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notices (
  id         SERIAL PRIMARY KEY,
  society_id INT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  important  BOOLEAN NOT NULL DEFAULT false,
  posted_by  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB NOT NULL DEFAULT '{}',
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, id);

-- Complaint photos live in the database, so the server keeps no files
-- (free hosting like Render wipes the disk on every restart).
CREATE TABLE IF NOT EXISTS photos (
  id         TEXT PRIMARY KEY,                 -- random, unguessable
  mime       TEXT NOT NULL,
  data       BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
