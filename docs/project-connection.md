# Project connection

## Уже известные параметры проекта

- `project ref`: `zhkckursnlxryccqfzgd`
- `SUPABASE_URL`: `https://zhkckursnlxryccqfzgd.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: задан

## Что еще нужно для полного боевого запуска

- `SUPABASE_SERVICE_ROLE_KEY`
- пароль от Postgres вместо `YOUR-PASSWORD`
- либо `supabase login` через ваш access token в CLI

## Почему этого не хватает

Без этих данных нельзя надежно завершить:

- `supabase secrets set`
- `supabase functions deploy`
- `supabase db push`
- установку рабочего webhook на production function URL

## Что уже подготовлено в репозитории

- `supabase/config.toml` уже привязан к вашему `project ref`
- `.env.example` уже содержит ваш `SUPABASE_URL` и publishable key
- deployment-инструкция подготовлена в `docs/deploy-supabase.md`
