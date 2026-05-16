create table if not exists user_category_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category_key text not null, -- 'meat', 'dairy', 'snacks' и т.д.
  created_at timestamptz not null default now(),
  unique (user_id, category_key)
);