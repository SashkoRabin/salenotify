# SaleNotify CZ

SaleNotify CZ is a Telegram bot that tracks supermarket discounts in Czech cities and sends a daily digest to subscribed users.

The project is built around Supabase Edge Functions and a shared TypeScript layer for:

- Telegram webhook orchestration
- discount ingestion from supermarket sources
- digest composition and rendering
- multilingual UI and category preferences

## Current runtime

- Runtime: `Supabase Edge Functions (Deno)`
- Database: `Supabase Postgres`
- Delivery: `Telegram Bot API`
- Scheduling: hourly cron with digest dispatch at `09:00 Europe/Prague`

## Main flows

1. User starts the bot and selects a language.
2. User enters a Czech city.
3. User selects supermarket chains.
4. Bot stores the active subscription and optional preferred categories.
5. Bot sends the first digest immediately.
6. Bot keeps sending a daily digest with current offers.
7. Discount journals can open as a leaflet carousel with page navigation where the source supports it.

## Project structure

```text
docs/
  architecture.md
  code-structure.md
  data-sources.md
  deploy-supabase.md
  digest-pipeline.md
  functionality.md
  roadmap.md

supabase/
  functions/
    telegram-webhook/
      index.ts
    daily-digest/
      index.ts
    ingest-source/
      index.ts
    _shared/
      adapters/
      catalog.ts
      categories.ts
      config.ts
      copy.ts
      db.ts
      digest.ts
      digest-model.ts
      digest-render.ts
      digest-types.ts
      digest-actions.ts
      i18n.ts
      offers.ts
      store-carousel.ts
      telegram.ts
      translator.ts
      types.ts
      user-state.ts
  migrations/
```

## Refactor status

The current codebase already includes a structural refactor aimed at reducing the size and responsibility of the Telegram webhook layer.

Key changes:

- `telegram-webhook/index.ts` now acts as a thin request router.
- user profile and subscription persistence moved to `_shared/user-state.ts`.
- digest-related chat actions moved to `_shared/digest-actions.ts`.
- store carousel logic moved to `_shared/store-carousel.ts`.
- leaflet page resolution and carousel logic moved to `_shared/leaflets.ts`.
- Telegram API calls now go through a shared helper in `_shared/telegram.ts`.

## Core modules

- `telegram-webhook/index.ts`
  Handles Telegram updates, onboarding, commands, callbacks, and routing.

- `_shared/user-state.ts`
  User profile updates, onboarding steps, active subscription snapshot, chain persistence.

- `_shared/digest.ts`
  Digest building, category comparison, store detail sourcing, source refresh orchestration.

- `_shared/digest-model.ts`
  Offer deduplication, ranking, normalization, and scoring.

- `_shared/digest-render.ts`
  Telegram HTML rendering, pricing lines, digest blocks, and compact output formatting.

- `_shared/offers.ts`
  Stored-offer reads, live fallback, ingestion persistence, stale-offer pruning.

- `_shared/store-carousel.ts`
  Product carousel and leaflet carousel delivery for Telegram.

- `_shared/leaflets.ts`
  Leaflet discovery, page extraction, fallback building, and carousel caption formatting.

- `_shared/adapters/*`
  Chain-specific data acquisition logic for Kaufland, Albert, BILLA, Lidl, PENNY, and Kupi-backed flows.

## Notes for the next iteration

- The project has no Git metadata in the current workspace snapshot.
- `deno` is not available locally in this environment.
- A plain `tsc` pass still surfaces older type issues in pre-existing shared modules unrelated to this refactor.

Those issues were left untouched unless they directly blocked the structural refactor.
