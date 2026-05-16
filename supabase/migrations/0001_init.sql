create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique,
  telegram_chat_id bigint not null,
  username text,
  first_name text,
  last_name text,
  language_code text,
  notifications_enabled boolean not null default true,
  onboarding_step text not null default 'awaiting_city',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cities (
  id uuid primary key default gen_random_uuid(),
  country_code text not null default 'CZ',
  name text not null,
  slug text not null unique,
  region text,
  created_at timestamptz not null default now()
);

create table if not exists chains (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references chains(id) on delete cascade,
  city_id uuid references cities(id) on delete set null,
  external_id text,
  name text not null,
  address text,
  latitude numeric,
  longitude numeric,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (chain_id, external_id)
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  city_id uuid not null references cities(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, city_id)
);

create table if not exists subscription_chains (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  chain_id uuid not null references chains(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (subscription_id, chain_id)
);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references chains(id) on delete cascade,
  city_id uuid references cities(id) on delete set null,
  store_id uuid references stores(id) on delete set null,
  external_offer_id text,
  title text not null,
  brand text,
  category text,
  price_current numeric,
  price_original numeric,
  currency text not null default 'CZK',
  discount_percent numeric,
  valid_from date,
  valid_to date,
  source_url text not null,
  source_type text not null,
  scope text not null default 'national',
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists offers_chain_external_offer_idx
  on offers (chain_id, external_offer_id)
  where external_offer_id is not null;

create table if not exists digest_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  details jsonb
);

create table if not exists message_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  digest_run_id uuid references digest_runs(id) on delete set null,
  telegram_message_id bigint,
  sent_at timestamptz not null default now(),
  status text not null default 'sent',
  payload jsonb
);

insert into chains (code, name)
values
  ('kaufland', 'Kaufland'),
  ('penny', 'PENNY')
on conflict (code) do nothing;

insert into cities (name, slug, region)
values
  ('Praha', 'praha', 'Prague'),
  ('Brno', 'brno', 'South Moravian'),
  ('Ostrava', 'ostrava', 'Moravian-Silesian'),
  ('Plzen', 'plzen', 'Pilsen'),
  ('Liberec', 'liberec', 'Liberec'),
  ('Olomouc', 'olomouc', 'Olomouc'),
  ('Ceske Budejovice', 'ceske-budejovice', 'South Bohemian'),
  ('Hradec Kralove', 'hradec-kralove', 'Hradec Kralove'),
  ('Pardubice', 'pardubice', 'Pardubice'),
  ('Zlin', 'zlin', 'Zlin'),
  ('Usti nad Labem', 'usti-nad-labem', 'Usti nad Labem'),
  ('Karlovy Vary', 'karlovy-vary', 'Karlovy Vary'),
  ('Jihlava', 'jihlava', 'Vysocina')
on conflict (slug) do nothing;
