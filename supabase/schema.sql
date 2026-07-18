-- Run this in the Supabase SQL Editor (Project -> SQL Editor) before using the
-- PDF-text cache. It stores one row per extracted PDF, keyed by the R2 object
-- key (same identity already used for the IndexedDB cache client-side).

create table if not exists pdf_extractions (
    id text primary key,           -- R2 object key (filename), same as `key` below
    key text not null,
    size bigint,
    last_modified text,            -- R2 LastModified, used for cache-staleness checks
    num_pages integer,
    text text not null,
    used_ocr boolean not null default false,
    extracted_at timestamptz not null default now()
);

-- Locked down: only the server (using the secret/service-role key, which
-- bypasses RLS) reads or writes this table. No policies are defined, so the
-- publishable (anon) key has no access even if used directly from a browser.
alter table pdf_extractions enable row level security;
