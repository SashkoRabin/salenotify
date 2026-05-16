# Пайплайн дайджеста и модули

Сводка описывает, как из сырых акций в БД получается текст сообщения в Telegram. Подробнее о деплое edge-функций см. [deploy-supabase.md](deploy-supabase.md).

## Слои кода

| Модуль | Назначение |
|--------|------------|
| [`digest.ts`](../supabase/functions/_shared/digest.ts) | Оркестрация: загрузка офферов, переводы, сбор `buildDigestMessage`, детали магазина, сравнение по категории, расписание daily digest. |
| [`digest-types.ts`](../supabase/functions/_shared/digest-types.ts) | Тип [`DigestOffer`](../supabase/functions/_shared/digest-types.ts): нормализованная форма акции для сортировки, дедупа и HTML. |
| [`digest-model.ts`](../supabase/functions/_shared/digest-model.ts) | «Модель»: часовой пояс Праги, порог скидки для приоритета ключевых слов, расчёт процента скидки, дедуп по каноническому ключу и по локализованному заголовку, **collapse** похожих карточек одной сети с той же ценой, сортировка, остаток дней действия, `buildDisplayTitle` (вес, санитизация через адаптеры). |
| [`digest-render.ts`](../supabase/functions/_shared/digest-render.ts) | «Рендер» в Telegram HTML: заголовок дайджеста, строки премиум-карточек, мета (цена, скидка, срок), эвристика emoji по названию. |

Импорты из приложений:

- [`daily-digest`](../supabase/functions/daily-digest/index.ts) — `buildDigestMessage`, `shouldRunDailyDigest`, `refreshDigestSources`.
- [`telegram-webhook`](../supabase/functions/telegram-webhook/index.ts) — те же плюс `buildStoreDetail`, `buildCategoryComparison`, выбор сети, обновление источников.

### Меню «Детальніше» (карусель магазина)

В [`telegram-webhook`](../supabase/functions/telegram-webhook/index.ts) одно фото-сообщение редактируется через `editMessageMedia`: картинка товара и подпись с названием, фасовкой (если есть в `unitPrice` и её ещё нет в заголовке), текущей ценой, процентом скидки и «старой» ценой (Unicode U+0336). Порядок акций — [`sortOffersByDiscountDescending`](../supabase/functions/_shared/digest-model.ts) после дедупа; лимит карусели задаётся [`STORE_CAROUSEL_OFFER_LIMIT`](../supabase/functions/_shared/digest.ts) (по умолчанию 20). Навигация — inline-кнопки ◀ / ▶ (`storeCarouselKeyboard`).

## Получение данных: `offers.ts`

`collectDigest*` и `buildStoreDetail` вызывают [`fetchOffersForChain`](../supabase/functions/_shared/offers.ts) с `preferStored: true` и `allowLive: true`. То есть сначала читается кэш в Postgres; при необходимости триггерится живой запрос к источнику (в т.ч. для сетей через Kupi), чтобы не показывать устаревшую выдачу, если БД отстаёт.

## Дедупликация и лимиты

1. **До перевода:** `dedupeDigestOffers` — один ключ на канонический заголовок + текущая цена.
2. **После перевода:** `dedupeLocalizedOffers` — учитывается отображаемый заголовок и обе цены, чтобы не дублировать одну позицию на разных языках.
3. **Схлопывание ритейл-дублей:** `collapseRetailDuplicateOffers` объединяет офферы одной сети с одинаковой ценой и похожим «отпечатком» названия (частые дубликаты переводов/вариантов строки).

Сортировка цепочки: приоритет = скидка × 1000 + бонус за ключевые слова (яйца, мясо, молочка и т.д.) при скидке не ниже `PRIORITY_MIN_DISCOUNT_PERCENT` (20% в коде).

В ежедневном сообщении на сеть показывается не больше **`PREMIUM_VISIBLE_PER_CHAIN`** (6) карточек после всех этапов выше.

## Старые цены и HTML в Telegram

Для зачёркнутой старой цены не используется тег `<s>`: в режиме parse_mode HTML у ботов Telegram часто вырезает strike-теги, оставляя цифры. Вместо этого в [`formatDigestStrikeOldPrice`](../supabase/functions/_shared/digest-render.ts) применяется символ U+0336 (combining long stroke) после каждого символа строки — визуально зачёркивание без разметки.

## Часовой пояс

Даты в шапке и логика «дней до конца акции» завязаны на **`Europe/Prague`** (`PRAGUE_TIMEZONE` в `digest-model.ts`). Ежедневный запуск digest по коду ориентируется на локальный час «09:00» (`shouldRunDailyDigest` + `formatPragueHour`).
