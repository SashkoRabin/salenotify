create extension if not exists pg_net;
create extension if not exists pg_cron;

select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url')
where not exists (
  select 1 from vault.decrypted_secrets where name = 'project_url'
);

select vault.create_secret('YOUR_SUPABASE_ANON_KEY', 'anon_key')
where not exists (
  select 1 from vault.decrypted_secrets where name = 'anon_key'
);

select cron.schedule(
  'daily-digest-prague-time',
  '0 7 * * *',
  $$
  select
    net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/daily-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
      ),
      body := '{"trigger":"cron"}'::jsonb
    );
  $$
);
