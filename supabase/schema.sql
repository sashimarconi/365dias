create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('base', 'bump', 'upsell', 'shipping')),
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  sort integer not null default 0,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists products_type_active_sort_idx
  on products (type, active, sort, created_at);
