# Code Structure

## Entry points

### `supabase/functions/telegram-webhook/index.ts`

Thin router for:

- onboarding
- commands
- callback queries
- settings flows
- category preference editing

### `supabase/functions/daily-digest/index.ts`

Scheduled dispatcher for daily digests.

### `supabase/functions/ingest-source/index.ts`

Manual or scheduled refresh for a single chain.

## Shared modules

### `user-state.ts`

Owns:

- `ensureUserProfile`
- `getUserRecord`
- `getActiveSubscriptionSnapshot`
- `upsertSubscription`
- `saveSubscriptionChains`
- notification and onboarding updates

This file is the main persistence boundary for user/subscription state.

### `digest-actions.ts`

Owns chat-facing digest and preference screens:

- `sendTodayDigest`
- `sendCategoryComparison`
- `sendSettingsScreen`
- `sendPreferencesScreen`
- `queueDigestRefresh`

### `store-carousel.ts`

Owns the “More details” flow:

- detailed store offers
- image resolution
- carousel caption building
- photo edits for next/previous item

### `telegram.ts`

Owns Telegram transport concerns:

- low-level API requests
- keyboard builders
- chunked messages
- message edits
- callback answers

### `digest.ts`

Owns business orchestration:

- fetch digest offers per chain
- build digest text
- build category comparison
- build store detail feed
- trigger refreshes

### `digest-model.ts`

Owns data shaping and ranking:

- dedupe rules
- scoring
- category-aware prioritization
- normalized title handling
- date and discount helpers

### `offers.ts`

Owns offer persistence and retrieval:

- stored-first reads
- live fallback
- chain ingestion
- stale-offer cleanup

## Recommended extension points

- Add a new supermarket: `supabase/functions/_shared/adapters/<chain>.ts`
- Add a new user flow: keep routing in `telegram-webhook`, business logic in `_shared/`
- Change digest ranking: update `digest-model.ts`
- Change visual formatting: update `digest-render.ts`
- Change user copy: update `copy.ts`
