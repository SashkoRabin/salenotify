create table if not exists processed_telegram_updates (
  update_id bigint primary key,
  telegram_user_id bigint,
  telegram_chat_id bigint,
  message_id bigint,
  created_at timestamptz not null default now()
);
