# Functionality

## User-facing features

### Onboarding

- `/start`
- language selection
- free-form Czech city input with suggestions
- supermarket chain selection
- automatic subscription activation
- first digest sent immediately after setup

### Daily experience

- daily digest at `09:00 Europe/Prague`
- `/today` for a manual digest
- compact digest grouped by store
- preferred categories influence sorting
- category comparison across all selected stores

### Settings

- current city
- selected supermarket chains
- notification pause/resume
- language switch
- preferred categories
- status screen

### Store details

- “More details” flow
- leaflet-first journal mode for the selected chain
- page-by-page leaflet carousel where the source supports page images
- store-specific product carousel
- image support where source data allows it
- next/previous navigation through callback buttons
- automatic fallback to product cards if leaflet pages are unavailable

## Data features

- stored-first offer retrieval for speed
- live refresh fallback for freshness
- stale-offer pruning after successful ingestion
- deduplication across noisy chain sources
- translation layer for non-Czech UI languages

## Supported chain sources

- Kaufland
- PENNY
- Albert
- Lidl
- BILLA

Some chains have richer product-level sources than others, so output quality can vary by chain and source stability.
