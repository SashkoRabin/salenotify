import { db } from "./db.ts";
import { fetchAlbertOffers } from "./adapters/albert.ts";
import { getCategoryKeyFromText } from "./categories.ts";
import type { ProductCategoryKey } from "./categories.ts";
import {
  appendWeightToTitle,
  extractWeightFromString,
  normalizeDedupTitle,
  type IngestedOffer,
  removeDuplicateWeightVariants,
  sanitizeOfferTitleForDisplay,
} from "./adapters/common.ts";
import { fetchKauflandOffers } from "./adapters/kaufland.ts";
import { fetchLidlOffers } from "./adapters/lidl-generated.ts";
import { fetchBillaOffers } from "./adapters/billa.ts";
import { fetchPennyOffers } from "./adapters/penny.ts";

type OfferRow = {
  external_offer_id: string;
  title: string;
  brand: string | null;
  category: string | null;
  category_key: string | null;
  price_current: number | null;
  price_original: number | null;
  discount_percent: number | null;
  valid_from: string | null;
  valid_to: string | null;
  source_url: string;
  source_type: string;
  scope: string;
  raw_payload?: Record<string, unknown> | null;
};

type FetchOffersOptions = {
  preferStored?: boolean;
  allowLive?: boolean;
};

const chainIdCache = new Map<string, string>();
const offerCache = new Map<string, { expiresAt: number; offers: IngestedOffer[] }>();
const OFFER_CACHE_TTL_MS = 5 * 60 * 1000;

function parseUnitPriceFromRawPayload(rawPayload?: Record<string, unknown> | null): string | null {
  if (!rawPayload) return null;

  const unitPrice = rawPayload.unitPrice;
  if (typeof unitPrice === "string" && unitPrice.trim().length > 0) {
    return unitPrice.trim();
  }

  if (typeof unitPrice === "number") {
    return String(unitPrice);
  }

  const snippet = typeof rawPayload.snippet === "string" ? rawPayload.snippet : null;
  return extractWeightFromString(snippet) ?? null;
}

async function getChainId(code: string): Promise<string> {
  const cached = chainIdCache.get(code);
  if (cached) {
    return cached;
  }

  const { data, error } = await db.from("chains").select("id").eq("code", code).single();

  if (error) {
    throw error;
  }

  chainIdCache.set(code, data.id);
  return data.id;
}

function mapStoredOffer(row: OfferRow): IngestedOffer {
  const rawTitle = removeDuplicateWeightVariants(row.title);
  const unitPrice = parseUnitPriceFromRawPayload(row.raw_payload);
  const title = sanitizeOfferTitleForDisplay(appendWeightToTitle(rawTitle, unitPrice, row.title));

  const fallbackCategoryKey = row.category_key as ProductCategoryKey | null ?? getCategoryKeyFromText(title);

  return {
    externalOfferId: row.external_offer_id,
    title,
    brand: row.brand,
    category: row.category,
    categoryKey: fallbackCategoryKey,
    priceCurrent: row.price_current,
    priceOriginal: row.price_original,
    discountPercent: row.discount_percent,
    unitPrice,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    sourceUrl: row.source_url,
    sourceType: row.source_type,
    scope: row.scope as "national",
    imageUrl: null,
    rawPayload: row.raw_payload ?? {},
  };
}

function getCanonicalStoredOfferKey(offer: IngestedOffer) {
  const displayTitle = appendWeightToTitle(offer.title, offer.unitPrice ?? null, offer.title);
  const normalized = normalizeDedupTitle(displayTitle);
  return `${normalized}|${offer.priceCurrent ?? "na"}|${offer.priceOriginal ?? "na"}`;
}

function dedupeStoredOffers(offers: IngestedOffer[]) {
  const unique = new Map<string, IngestedOffer>();

  for (const offer of offers) {
    const key = getCanonicalStoredOfferKey(offer);
    if (!unique.has(key)) {
      unique.set(key, offer);
    }
  }

  return Array.from(unique.values());
}

function getOfferCacheKey(chainCode: string, limit: number) {
  return `${chainCode}:${limit}`;
}

function getCachedOffers(chainCode: string, limit: number) {
  const cacheKey = getOfferCacheKey(chainCode, limit);
  const cached = offerCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    offerCache.delete(cacheKey);
    return null;
  }

  return cached.offers;
}

function setCachedOffers(chainCode: string, limit: number, offers: IngestedOffer[]) {
  offerCache.set(getOfferCacheKey(chainCode, limit), {
    offers,
    expiresAt: Date.now() + OFFER_CACHE_TTL_MS,
  });
}

function clearChainOfferCache(chainCode: string) {
  for (const key of offerCache.keys()) {
    if (key.startsWith(`${chainCode}:`)) {
      offerCache.delete(key);
    }
  }
}

function getPragueToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function getStoredOffersForChain(chainCode: string, limit = 24): Promise<IngestedOffer[]> {
  const cached = getCachedOffers(chainCode, limit);
  if (cached) {
    return cached;
  }

  const chainId = await getChainId(chainCode);
  const today = getPragueToday();
  const fetchLimit = Math.max(limit, chainCode === "kaufland" ? 120 : 40);

  const { data, error } = await db
    .from("offers")
    .select(`
      external_offer_id,
      title,
      brand,
      category,
      category_key,
      price_current,
      price_original,
      discount_percent,
      valid_from,
      valid_to,
      source_url,
      source_type,
      scope,
      raw_payload
    `)
    .eq("chain_id", chainId)
    .or(`valid_to.gte.${today},valid_to.is.null`)
    .order("discount_percent", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(fetchLimit);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as OfferRow[];
  const offers = dedupeStoredOffers(rows.map((row) => mapStoredOffer(row)));
  setCachedOffers(chainCode, limit, offers);
  return offers;
}

async function fetchLiveOffersForChain(chainCode: string, limit?: number): Promise<IngestedOffer[]> {
  switch (chainCode) {
    case "kaufland":
      return await fetchKauflandOffers(Math.max(limit ?? 24, 320));
    case "albert":
      return await fetchAlbertOffers(limit ?? 4);
    case "lidl":
      return await fetchLidlOffers(limit ?? 6);
    case "billa":
      return await fetchBillaOffers(limit ?? 4);
    case "penny":
      return await fetchPennyOffers(limit ?? 8);
    default:
      return [];
  }
}

async function upsertOffers(chainCode: string, offers: IngestedOffer[]) {
  if (offers.length === 0) {
    return 0;
  }

  const chainId = await getChainId(chainCode);
  const payload = offers.map((offer) => ({
    chain_id: chainId,
    external_offer_id: offer.externalOfferId,
    title: offer.title,
    brand: offer.brand,
    category: offer.category,
    category_key: offer.categoryKey ?? null,
    price_current: offer.priceCurrent,
    price_original: offer.priceOriginal,
    discount_percent: offer.discountPercent,
    valid_from: offer.validFrom,
    valid_to: offer.validTo,
    source_url: offer.sourceUrl,
    source_type: offer.sourceType,
    scope: offer.scope,
    raw_payload: offer.rawPayload,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await db.from("offers").upsert(payload, {
    onConflict: "chain_id,external_offer_id",
  });

  if (error) {
    throw error;
  }

  return payload.length;
}

async function pruneMissingOffers(chainCode: string, currentExternalOfferIds: string[]) {
  const chainId = await getChainId(chainCode);
  const today = getPragueToday();

  let query = db
    .from("offers")
    .delete()
    .eq("chain_id", chainId)
    .or(`valid_to.gte.${today},valid_to.is.null`);

  if (currentExternalOfferIds.length > 0) {
    query = query.not("external_offer_id", "in", `(${currentExternalOfferIds.map((id) => `"${id.replaceAll("\"", "\\\"")}"`).join(",")})`);
  }

  const { error } = await query;
  if (error) {
    throw error;
  }
}

const KUPI_BACKED_CHAINS = new Set(["penny", "albert", "lidl", "billa"]);

function storedKupiOffersLackDiscounts(stored: IngestedOffer[]): boolean {
  return stored.some((o) =>
    o.sourceType === "kupi_chain_page" &&
    o.discountPercent == null &&
    o.priceOriginal == null
  );
}

export async function fetchOffersForChain(
  chainCode: string,
  limit?: number,
  options: FetchOffersOptions = {},
): Promise<IngestedOffer[]> {
  const fetchLimit = limit ?? 24;

  if (options.preferStored) {
    try {
      const stored = await getStoredOffersForChain(chainCode, fetchLimit);
      const staleKupi =
        KUPI_BACKED_CHAINS.has(chainCode) &&
        stored.length > 0 &&
        storedKupiOffersLackDiscounts(stored);

      if (options.allowLive === false) {
        return stored;
      }

      if (stored.length > 0 && !staleKupi) {
        return stored;
      }

      if (staleKupi) {
        try {
          const live = await fetchLiveOffersForChain(chainCode, fetchLimit);
          const liveHasDiscounts = live.some((o) => o.discountPercent != null || o.priceOriginal != null);
          if (liveHasDiscounts) {
            try {
              await upsertOffers(chainCode, live);
              clearChainOfferCache(chainCode);
            } catch (persistError) {
              console.error(`Failed to persist refreshed ${chainCode} offers`, persistError);
            }
            return live;
          }
        } catch (error) {
          console.error(`Live refresh failed for stale ${chainCode}`, error);
        }
        return stored;
      }
    } catch (error) {
      console.error(`Failed to read stored ${chainCode} offers`, error);
      if (options.allowLive === false) {
        return [];
      }
    }
  }

  if (options.allowLive === false) {
    return [];
  }

  return await fetchLiveOffersForChain(chainCode, fetchLimit);
}

export async function ingestChainOffers(chainCode: string, limit?: number) {
  const offers = await fetchLiveOffersForChain(chainCode, limit);
  let count = 0;
  let persisted = false;

  try {
    count = await upsertOffers(chainCode, offers);
    await pruneMissingOffers(chainCode, offers.map((offer) => offer.externalOfferId));
    persisted = true;
    clearChainOfferCache(chainCode);
  } catch (error) {
    console.error(`Failed to persist ${chainCode} offers`, error);
  }

  return {
    chain: chainCode,
    offers,
    count,
    persisted,
  };
}

export async function ingestKauflandOffers() {
  return await ingestChainOffers("kaufland");
}
