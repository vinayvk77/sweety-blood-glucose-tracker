CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS readings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  slot VARCHAR(32) NOT NULL CHECK (slot IN (
    'Morning (fasting)',
    'After breakfast',
    'After lunch',
    'After dinner'
  )),
  value INTEGER NOT NULL CHECK (value BETWEEN 40 AND 600),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT readings_one_per_slot_per_day UNIQUE (user_id, date, slot)
);

CREATE INDEX IF NOT EXISTS readings_user_date_idx ON readings (user_id, date);
