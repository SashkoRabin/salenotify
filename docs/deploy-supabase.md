# Supabase deploy

## Что понадобится

- `Supabase CLI`
- `project ref`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`

## Команды

### 1. Логин и привязка проекта

```bash
# PowerShell (одноразово в текущей сессии):
$env:SUPABASE_ACCESS_TOKEN='YOUR_SUPABASE_ACCESS_TOKEN'

# проверка авторизации:
supabase projects list

supabase login
supabase link --project-ref zhkckursnlxryccqfzgd
```

Примечание: если задан `SUPABASE_ACCESS_TOKEN`, Supabase CLI использует токен автоматически и интерактивный логин можно пропустить.

### 2. Secrets для functions

```bash
supabase secrets set SUPABASE_URL=https://zhkckursnlxryccqfzgd.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
supabase secrets set TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
supabase secrets set TELEGRAM_WEBHOOK_SECRET=YOUR_TELEGRAM_WEBHOOK_SECRET
supabase secrets set DEFAULT_TIMEZONE=Europe/Prague
```

> После изменения `TELEGRAM_BOT_TOKEN` или `TELEGRAM_WEBHOOK_SECRET` рекомендуется заново задеплоить `telegram-webhook` и заново выставить webhook у Telegram.

### 3. Деплой функций

```bash
supabase functions deploy telegram-webhook --no-verify-jwt
supabase functions deploy daily-digest --no-verify-jwt
supabase functions deploy ingest-source --no-verify-jwt
```

### 4. Применение миграций

```bash
supabase db push
```

Примечание:

- в проекте уже есть миграция `0003_fix_daily_digest_job.sql`, которая пересоздает cron-задачу на реальный production URL проекта `zhkckursnlxryccqfzgd`;
- для `daily-digest` авторизация через JWT не требуется, потому что функция уже помечена как `verify_jwt = false`.

### 5. Установка webhook Telegram

```text
POST https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
url=https://zhkckursnlxryccqfzgd.supabase.co/functions/v1/telegram-webhook
secret_token=YOUR_TELEGRAM_WEBHOOK_SECRET
drop_pending_updates=true
allowed_updates=["message","callback_query"]
```

Важно:
- `secret_token` должен совпадать с `TELEGRAM_WEBHOOK_SECRET` в Supabase secrets.
- `allowed_updates` обязательно должен включать `callback_query`, иначе inline-кнопки не будут доставляться.
- После изменения `TELEGRAM_WEBHOOK_SECRET` нужно заново выставить webhook и убедиться, что Telegram возвращает `ok: true`.

### 5.1. Отладка webhook

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

Проверьте:
- `url` совпадает с адресом функции
- `pending_update_count` равен `0`
- `allowed_updates` содержит `callback_query`
- нет `last_error_message` с `401 Unauthorized` или `503 Service Unavailable`

## Проверка

- `GET /getWebhookInfo` у Telegram должен вернуть установленный URL
- вызов `ingest-source` с `{"chain":"kaufland"}` должен вернуть preview акций
- `daily-digest` должен отправить тестовую сводку пользователям с активной подпиской

## Что уже реализовано

- webhook-поток с онбордингом
- ежедневная рассылка
- первый живой adapter для `Kaufland`
- cron migration для ежедневного запуска
