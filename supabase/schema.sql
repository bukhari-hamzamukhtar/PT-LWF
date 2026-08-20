-- ============================================================================
-- Project Topi — Supabase schema
-- Run this once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / OR REPLACE).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Lalas — the main welfare-tracking table
-- ----------------------------------------------------------------------------
create table if not exists lalas (
  id            uuid primary key default gen_random_uuid(),
  name          text,
  phone_number  text,
  cnic          text,
  help_status   text not null default 'Pending' check (help_status in ('Yes', 'No', 'Pending')),
  details       text,
  extra_data    jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz  -- non-null = sitting in the trash bin
);

comment on table lalas is 'Campus support staff (Lalas) tracked for welfare / aid purposes.';
comment on column lalas.deleted_at is 'Soft-delete marker. NULL = active, non-NULL = in the trash bin.';

-- Helpful indexes for lookups, search, and the trash/active split.
create index if not exists idx_lalas_deleted_at on lalas (deleted_at);
create index if not exists idx_lalas_cnic        on lalas (cnic);
create index if not exists idx_lalas_phone       on lalas (phone_number);
create index if not exists idx_lalas_name_lower  on lalas (lower(name));
create index if not exists idx_lalas_created_at  on lalas (created_at desc);

-- Keep updated_at current on every row update.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_lalas_updated_at on lalas;
create trigger trg_lalas_updated_at
  before update on lalas
  for each row
  execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. History logs — audit trail for Track Records / Added Stuff / Deleted Stuff
-- ----------------------------------------------------------------------------
create table if not exists history_logs (
  id             uuid primary key default gen_random_uuid(),
  action_type    text not null check (action_type in ('create', 'update', 'delete', 'restore')),
  lala_id        uuid references lalas(id) on delete set null,
  lala_name      text,   -- snapshot of the name at the time of the event, so history
                          -- still reads clearly even after a permanent delete
  field_changed  text,   -- e.g. 'name', 'phone_number', 'cnic', 'help_status', 'details'
  old_value      text,
  new_value      text,
  details        text,   -- freeform note, e.g. "Added via upload of \"march.xlsx\""
  created_at     timestamptz not null default now()
);

comment on table history_logs is 'Append-only audit trail for every create/update/delete/restore on lalas.';

create index if not exists idx_history_action_type on history_logs (action_type);
create index if not exists idx_history_created_at  on history_logs (created_at desc);
create index if not exists idx_history_lala_id     on history_logs (lala_id);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------
-- RLS is intentionally OFF. Access control for this app happens at the
-- application layer: every request is gated by Next.js middleware checking a
-- signed session cookie before it ever reaches the database, and the browser
-- is never given a Supabase key at all — every query runs server-side with
-- the service_role key, which bypasses RLS regardless of its setting. Leaving
-- RLS enabled with no policies would only block the app's own service_role
-- client too, so it's disabled here to match how the app actually works.
alter table lalas         disable row level security;
alter table history_logs  disable row level security;

-- Preserve columns that vary between source workbooks on existing databases.
alter table lalas add column if not exists extra_data jsonb not null default '{}'::jsonb;
