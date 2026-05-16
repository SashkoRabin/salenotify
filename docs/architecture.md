# Architecture

## Goal

Maintain a Telegram bot that delivers current supermarket discounts for Czech cities with minimal operational overhead and a clear serverless deployment path.

## Runtime model

- `telegram-webhook`
  Receives Telegram updates and routes user actions.

- `ingest-source`
  Refreshes offers for one specific supermarket chain.

- `daily-digest`
  Runs on schedule, refreshes data, builds user digests, and sends messages.

## Shared layers

### Domain and state

- `user-state.ts`
  Encapsulates user profile writes, onboarding state transitions, subscription snapshots, and notification toggles.

- `categories.ts`
  Category dictionary, category scoring, and user preference helpers.

- `catalog.ts`
  Czech cities, supported chains, aliases, city lookup, and chain parsing.

### Digest pipeline

- `digest.ts`
  High-level digest orchestration and cross-chain comparison.

- `digest-model.ts`
  Ranking and deduplication rules.

- `digest-render.ts`
  Telegram-oriented HTML rendering for compact, readable output.

- `digest-actions.ts`
  Chat-facing digest flows such as `/today`, settings screens, and category comparison.

### Transport

- `telegram.ts`
  Telegram Bot API transport, keyboard builders, chunking, edits, and callback answers.

- `copy.ts`
  UI copy for onboarding, settings, and user-facing prompts.

- `i18n.ts`
  Language mapping, localized commands, and translation key resolution.

### Data acquisition

- `offers.ts`
  Reads from database first, optionally refreshes from live sources, persists normalized offers, and prunes stale ones.

- `adapters/*`
  Chain-specific source adapters.

- `store-carousel.ts`
  Detailed per-store card flow with images and navigation callbacks.

## Request lifecycle

### Webhook request

1. Verify Telegram secret header.
2. De-duplicate Telegram update IDs in memory.
3. Ensure user profile exists and refresh Telegram metadata.
4. Load active subscription snapshot.
5. Route command, callback, or onboarding text input.
6. Reply immediately while data refresh runs in best-effort background where possible.

### Daily digest

1. Check Prague time window.
2. Load active subscriptions.
3. Refresh selected chains.
4. Build digest text using stored data with live fallback where needed.
5. Send final digest to Telegram.

## Design principles

- Keep webhook orchestration thin.
- Keep database writes centralized in one state module.
- Keep rendering separate from ranking logic.
- Keep supermarket adapters isolated from Telegram UX.
- Prefer stored data for responsiveness and live refresh for freshness.

## Current tradeoffs

- Some older shared modules still carry mixed responsibilities and pre-existing type debt.
- Full local static verification is limited in this workspace because Deno is unavailable.
- Source quality varies by chain, so adapters need different parsing strategies.
