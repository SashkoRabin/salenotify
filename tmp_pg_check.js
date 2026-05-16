const { Client } = require('pg');
(async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres:Asadas0501%40@db.zhkckursnlxryccqfzgd.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const result = await client.query('select telegram_user_id, telegram_chat_id, onboarding_step, language_code from users order by created_at desc limit 10');
  console.log(JSON.stringify(result.rows, null, 2));
  await client.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
