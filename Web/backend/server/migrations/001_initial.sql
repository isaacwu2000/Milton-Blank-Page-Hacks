CREATE TABLE IF NOT EXISTS sportsbuilder_records (
  kind text NOT NULL CHECK (kind IN ('profiles','tools','sessions')),
  id uuid NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind,id)
);
CREATE INDEX IF NOT EXISTS sportsbuilder_records_kind_created ON sportsbuilder_records(kind,created_at DESC);
