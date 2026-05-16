alter table offers
  add column if not exists category_key text;

create index if not exists offers_category_key_idx
  on offers (category_key);
