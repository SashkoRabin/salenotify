import {
  appendWeightToTitle as appendWeightToTitleFromCommon,
  normalizeDedupTitle as normalizeDedupTitleFromCommon,
  removeDuplicateWeightVariants as removeDuplicateWeightVariantsFromCommon,
  sanitizeOfferTitleForDisplay as sanitizeOfferTitleForDisplayFromCommon,
} from "./adapters/common.ts";
import { getCategoryKeyFromText } from "./categories.ts";
import type { DigestOffer } from "./digest-types.ts";
import { db } from "./db.ts";

export { type DigestOffer } from "./digest-types.ts";

type OfferForDigestModel = {
  externalOfferId: string;
  title: string;
  category: string | null;
  categoryKey: DigestOffer["categoryKey"];
  priceCurrent: number | null;
  priceOriginal: number | null;
  discountPercent: number | null;
  unitPrice?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  chainCode?: string;
  chainName?: string;
  sourceUrl?: string | null;
  rawPayload?: Record<string, unknown> | null;
};

type UserCategoryPreferenceRow = {
  category_key: string;
};

export const PRAGUE_TIMEZONE = "Europe/Prague";
export const PRIORITY_MIN_DISCOUNT_PERCENT = 20;
/** How many product cards are shown per chain in the daily /today-style digest. */
export const PREMIUM_VISIBLE_PER_CHAIN = 6;

const appendWeightToTitle = appendWeightToTitleFromCommon;
const normalizeDedupTitle = normalizeDedupTitleFromCommon;
const removeDuplicateWeightVariants = removeDuplicateWeightVariantsFromCommon;
const sanitizeOfferTitleForDisplay = sanitizeOfferTitleForDisplayFromCommon;

/** Бонус за выбранную пользователем категорию предпочтений */
const USER_PREFERENCE_BONUS = 800;

const PRIORITY_KEYWORDS = [
  { weight: 340, patterns: ["vejce", "vajec", "eggs", "egg"] },
  { weight: 300, patterns: ["maso", "kure", "kureci", "veprove", "hovezi", "kruti", "mlete", "meat"] },
  { weight: 280, patterns: ["mleko", "milk", "dairy", "jogurt", "yogurt", "cheese", "syr", "tvaroh", "kefir", "smetana", "maslo"] },
];

/** Latin-only normalization for keyword matching (legacy). */
export function normalizeAsciiFold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Multiscript fingerprint for duplicate-title clustering (keeps Cyrillic etc.). */
export function normalizeForDedupeFingerprint(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\b\d+[.,]?\d*\b/g, " ")
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scorePriority(text: string) {
  const normalized = normalizeAsciiFold(text);
  let score = 0;

  for (const group of PRIORITY_KEYWORDS) {
    if (group.patterns.some((pattern) => normalized.includes(pattern))) {
      score += group.weight;
    }
  }

  return score;
}

export function effectiveDiscountPercent(offer: OfferForDigestModel): number {
  if (
    offer.priceOriginal != null &&
    offer.priceCurrent != null &&
    offer.priceOriginal > 0 &&
    offer.priceOriginal > offer.priceCurrent
  ) {
    const computed = Math.round(((offer.priceOriginal - offer.priceCurrent) / offer.priceOriginal) * 100);
    if (computed >= 1 && computed <= 99) {
      return computed;
    }
  }
  return Math.abs(offer.discountPercent ?? 0);
}

export function displayDiscountPercent(offer: OfferForDigestModel): number | null {
  if (
    offer.priceOriginal != null &&
    offer.priceCurrent != null &&
    offer.priceOriginal > 0 &&
    offer.priceOriginal > offer.priceCurrent
  ) {
    return Math.round(((offer.priceOriginal - offer.priceCurrent) / offer.priceOriginal) * 100);
  }
  if (offer.discountPercent != null) {
    return Math.abs(offer.discountPercent);
  }
  return null;
}

/** Получаем предпочтительные категории пользователя из базы */
async function getUserPreferredCategories(userId: string): Promise<Set<string>> {
  const { data, error } = await db
    .from("user_category_preferences")
    .select("category_key")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to fetch user category preferences:", error);
    return new Set();
  }

  return new Set(((data ?? []) as unknown as UserCategoryPreferenceRow[]).map((item) => item.category_key));
}

function scoreOfferPriority(offer: OfferForDigestModel, userPreferredCategories: Set<string> = new Set()) {
  const discount = effectiveDiscountPercent(offer);
  let score = discount * 1000;

  // Бонус за ключевые слова (мясо, молочка и т.д.)
  const keywordScore = discount >= PRIORITY_MIN_DISCOUNT_PERCENT
    ? scorePriority(`${offer.title} ${offer.category ?? ""}`)
    : 0;

  score += keywordScore;

  // Бонус за предпочтения пользователя
  const preferredCategoryKey = offer.categoryKey ?? getCategoryKeyFromText(offer.title);
  if (preferredCategoryKey && userPreferredCategories.has(preferredCategoryKey)) {
    score += USER_PREFERENCE_BONUS;
  }

  return score;
}

function getCanonicalDigestOfferKey(offer: OfferForDigestModel) {
  const displayTitle = appendWeightToTitle(offer.title, offer.unitPrice ?? null, offer.title);
  const normalized = normalizeDedupTitle(displayTitle);
  return `${normalized}|${offer.priceCurrent ?? "na"}`;
}

export function dedupeDigestOffers<T extends OfferForDigestModel>(offers: T[]): T[] {
  const unique = new Map<string, T>();
  for (const offer of offers) {
    const key = getCanonicalDigestOfferKey(offer);
    if (!unique.has(key)) {
      unique.set(key, offer);
    }
  }
  return Array.from(unique.values());
}

function normalizeDisplayTitle(title: string) {
  return title
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildDisplayTitle(offer: OfferForDigestModel, translatedTitle: string) {
  const base = removeDuplicateWeightVariants(normalizeDisplayTitle(translatedTitle || offer.title));
  const withWeight = appendWeightToTitle(
    base,
    offer.unitPrice ?? null,
    offer.title,
  );
  return sanitizeOfferTitleForDisplay(withWeight);
}

function fingerprintForRetailDedupe(offer: OfferForDigestModel, translations: Map<string, string>) {
  const t = buildDisplayTitle(offer, translations.get(offer.title) ?? offer.title);
  return normalizeForDedupeFingerprint(t);
}

const RETAIL_DEDUPE_BRAND = new RegExp(
  "(^|\\s)(milka|activia|maggi|pfanner|gambrinus|florian|hermel|palou|jojo|sidolux|manhattan|pierot|zotten|danone|olma|olmu|tiger|jo-?jo|pom-?b|pom-bär)(\\s|$)",
  "iu",
);

function fingerprintsSimilar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 8 && b.length >= 8 && (a.includes(b) || b.includes(a))) return true;

  const ta = a.split(/\s+/).filter((w) => w.length > 1);
  const tb = b.split(/\s+/).filter((w) => w.length > 1);
  if (ta.length === 0 || tb.length === 0) return false;

  const sa = new Set(ta);
  const sb = new Set(tb);
  let inter = 0;
  for (const w of sa) {
    if (sb.has(w)) inter++;
  }
  const uni = sa.size + sb.size - inter;
  if (uni === 0) return false;

  const jaccard = inter / uni;
  const minSize = Math.min(sa.size, sb.size);
  const overlapMin = minSize > 0 ? inter / minSize : 0;

  if (jaccard >= 0.62 && overlapMin >= 0.55) return true;
  if (RETAIL_DEDUPE_BRAND.test(a) && RETAIL_DEDUPE_BRAND.test(b) && jaccard >= 0.22 && overlapMin >= 0.35) {
    return true;
  }
  return false;
}

function pickRepresentativeFromCluster<T extends OfferForDigestModel>(cluster: T[], translations: Map<string, string>): T {
  const score = (o: T) => {
    let s = 0;
    if (o.priceOriginal != null) s += 500;
    if (o.discountPercent != null) s += 200;
    const t = buildDisplayTitle(o, translations.get(o.title) ?? o.title);
    s -= Math.min(t.length, 500);
    return s;
  };
  return cluster.reduce((best, cur) => (score(cur) > score(best) ? cur : best));
}

/** Merges same-chain offers at the same price with near-identical fingerprints */
export function collapseRetailDuplicateOffers<T extends OfferForDigestModel>(offers: T[], translations: Map<string, string>): T[] {
  const byKey = new Map<string, T[]>();
  for (const o of offers) {
    const k = `${o.chainCode}|${o.priceCurrent ?? "na"}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(o);
  }

  const result: T[] = [];
  for (const group of byKey.values()) {
    const remaining = [...group];
    while (remaining.length > 0) {
      const seed = remaining.shift()!;
      const cluster = [seed];
      let growing = true;
      while (growing) {
        growing = false;
        for (let i = 0; i < remaining.length; i++) {
          const o = remaining[i]!;
          const fo = fingerprintForRetailDedupe(o, translations);
          if (cluster.some((c) => fingerprintsSimilar(fingerprintForRetailDedupe(c, translations), fo))) {
            cluster.push(o);
            remaining.splice(i, 1);
            growing = true;
            break;
          }
        }
      }
      result.push(pickRepresentativeFromCluster(cluster, translations));
    }
  }
  return result;
}

function getLocalizedDigestOfferKey(offer: OfferForDigestModel, translatedTitle: string) {
  const displayTitle = buildDisplayTitle(offer, translatedTitle);
  const normalized = normalizeDedupTitle(displayTitle);
  return `${normalized}|${offer.priceCurrent ?? "na"}|${offer.priceOriginal ?? "na"}`;
}

export function dedupeLocalizedOffers<T extends OfferForDigestModel>(offers: T[], translations: Map<string, string>) {
  const seen = new Set<string>();
  const kept: T[] = [];

  for (const offer of offers) {
    const translatedTitle = translations.get(offer.title) ?? offer.title;
    const key = getLocalizedDigestOfferKey(offer, translatedTitle);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(offer);
  }

  return kept;
}

/** Store-detail carousel: largest discount first, then cheaper current price. */
export function sortOffersByDiscountDescending<T extends OfferForDigestModel>(offers: T[]) {
  return [...offers].sort((left, right) => {
    const discR = effectiveDiscountPercent(right);
    const discL = effectiveDiscountPercent(left);
    if (discR !== discL) return discR - discL;

    const pl = left.priceCurrent;
    const pr = right.priceCurrent;
    if (pl != null && pr != null && pl !== pr) return pl - pr;
    if (pl == null && pr != null) return 1;
    if (pl != null && pr == null) return -1;

    return left.title.localeCompare(right.title);
  });
}

/** Основная сортировка для дайджеста с учётом предпочтений пользователя */
export function sortChainOffers<T extends OfferForDigestModel>(offers: T[], userPreferredCategories: Set<string> = new Set()) {
  return [...offers].sort((left, right) => {
    const leftScore = scoreOfferPriority(left, userPreferredCategories);
    const rightScore = scoreOfferPriority(right, userPreferredCategories);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    const rightDiscount = effectiveDiscountPercent(right);
    const leftDiscount = effectiveDiscountPercent(left);

    if (rightDiscount !== leftDiscount) {
      return rightDiscount - leftDiscount;
    }

    return left.title.localeCompare(right.title);
  });
}

export function formatDateRange(validFrom: string | null, validTo: string | null) {
  if (!validFrom && !validTo) {
    return null;
  }

  const start = validFrom ? validFrom.split("-").reverse().join(".") : "now";
  const end = validTo ? validTo.split("-").reverse().join(".") : "later";
  return `${start} - ${end}`;
}

export function getDaysRemaining(validTo: string | null, now: Date) {
  if (!validTo) {
    return null;
  }

  const pragueToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: PRAGUE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const end = new Date(`${validTo}T00:00:00Z`);
  const today = new Date(`${pragueToday}T00:00:00Z`);
  const diffMs = end.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / 86400000) + 1;

  if (diffDays <= 0) {
    return null;
  }

  return diffDays;
}

export function formatPragueHour(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: PRAGUE_TIMEZONE,
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  }).format(date);
}
