CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_messages_array CHECK (jsonb_typeof(messages) = 'array')
);

CREATE TABLE IF NOT EXISTS rate_limit_state (
  user_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  rule text NOT NULL,
  window_started_at timestamptz NOT NULL,
  count integer NOT NULL CHECK (count > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, rule)
);

CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  route text NOT NULL,
  model text,
  request_id uuid NOT NULL,
  input_chars integer NOT NULL DEFAULT 0 CHECK (input_chars >= 0),
  status text NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_events_user_created_idx
  ON usage_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS conversations_updated_idx
  ON conversations (updated_at DESC);

