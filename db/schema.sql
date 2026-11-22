CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS wells (
  well_id     text PRIMARY KEY,
  field       text NOT NULL,
  lat         double precision NOT NULL,
  lon         double precision NOT NULL,
  status      text NOT NULL CHECK (status IN ('producing', 'shut_in', 'workover', 'suspended')),
  well_type   text NOT NULL,
  lift_type   text NOT NULL,
  spud_date   date NOT NULL
);

CREATE TABLE IF NOT EXISTS production_daily (
  well_id      text NOT NULL REFERENCES wells(well_id),
  date         date NOT NULL,
  oil_bbl      double precision NOT NULL,
  gas_mscf     double precision NOT NULL,
  water_cut    double precision NOT NULL,
  uptime_hours double precision NOT NULL,
  PRIMARY KEY (well_id, date)
);

CREATE TABLE IF NOT EXISTS events (
  event_id       text PRIMARY KEY,
  well_id        text NOT NULL REFERENCES wells(well_id),
  category       text NOT NULL CHECK (category IN ('maintenance', 'incident')),
  type           text NOT NULL,
  start_date     date NOT NULL,
  end_date       date,
  downtime_hours double precision NOT NULL,
  status         text NOT NULL CHECK (status IN ('open', 'closed')),
  severity       text,
  description    text NOT NULL
);
CREATE INDEX IF NOT EXISTS events_well_idx ON events (well_id, start_date);

CREATE TABLE IF NOT EXISTS documents (
  doc_id    text PRIMARY KEY,
  doc_type  text NOT NULL,
  well_id   text REFERENCES wells(well_id),
  field     text,
  date      date NOT NULL,
  title     text NOT NULL,
  body      text NOT NULL,
  sha256    text NOT NULL
);

CREATE TABLE IF NOT EXISTS chunks (
  id              text PRIMARY KEY,
  document_id     text NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
  ordinal         int NOT NULL,
  section         text,
  text            text NOT NULL,
  tokens          int NOT NULL,
  well_id         text,
  field           text,
  date            date,
  doc_type        text NOT NULL,
  embedding       vector(1024) NOT NULL,
  embedding_model text NOT NULL,
  tsv             tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(section, '') || ' ' || text)
  ) STORED,
  UNIQUE (document_id, ordinal)
);
CREATE INDEX IF NOT EXISTS chunks_tsv_idx ON chunks USING gin (tsv);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS chunks_filter_idx ON chunks (well_id, field, doc_type, date);
