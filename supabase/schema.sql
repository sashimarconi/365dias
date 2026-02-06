create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('base', 'bump', 'upsell', 'shipping')),
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  compare_price_cents integer check (compare_price_cents >= 0),
  active boolean not null default true,
  sort integer not null default 0,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists products_type_active_sort_idx
  on products (type, active, sort, created_at);

create table if not exists analytics_sessions (
  session_id text primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  last_page text,
  last_event text,
  source text,
  user_agent text,
  utm jsonb
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  event_type text not null,
  page text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx
  on analytics_events (created_at);

create index if not exists analytics_events_type_idx
  on analytics_events (event_type, page, created_at);
