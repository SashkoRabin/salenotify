select cron.unschedule('daily-digest-prague-time')
where exists (
  select 1
  from cron.job
  where jobname = 'daily-digest-prague-time'
);

select cron.schedule(
  'daily-digest-prague-time',
  '0 7 * * *',
  $$
  select
    net.http_post(
      url := 'https://zhkckursnlxryccqfzgd.supabase.co/functions/v1/daily-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := '{"trigger":"cron"}'::jsonb
    );
  $$
);
