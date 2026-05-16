import type { ProductCategoryKey } from "../categories.ts";

export type IngestedOffer = {
  externalOfferId: string;
  title: string;
  brand: string | null;
  category: string | null;
  categoryKey: ProductCategoryKey | null;
  priceCurrent: number | null;
  priceOriginal: number | null;
  discountPercent: number | null;
  unitPrice: string | null;
  imageUrl: string | null;
  sourceUrl: string;
  sourceType: string;
  validFrom: string | null;
  validTo: string | null;
  scope: "national";
  rawPayload: Record<string, unknown>;
};

export function decodeHtml(value: string): string {
  const decoded = value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const repaired = repairMojibake(decoded);
  return repaired
    .replace(/\bPOM-B\s*\uFFFD\s*R\b/giu, "POM-BÄR")
    .replace(/\bPOM-BR\b/giu, "POM-BÄR");
}

/** Strips retail/marketing tails and fixes common encoding glitches in offer titles (display + dedupe). */
export function sanitizeOfferTitleForDisplay(title: string): string {
  let t = title.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return t;

  t = t.replace(/^(?:від)\s+\d+[.,]?\d*\s*(?:CZK|Kč|Kc|крон|грн)?\s+/iu, "");
  t = t.replace(/^(?:od|от)\s+\d+[.,]?\d*\s*(?:CZK|Kč|Kc)?\s+/iu, "");

  const tailRes = [
    /\s+зі\s+знижкою\s+\d+[.,]?\d*\s*(?:CZK|Kč|Kc|крон|грн)?\s*$/iu,
    /\s+з\s+знижкою\s+\d+[.,]?\d*\s*(?:CZK|Kč|Kc)?\s*$/iu,
    /\s*(?:se\s+)?slev(?:a|ou|ě)\s+\d+[.,]?\d*\s*(?:CZK|Kč|Kc|чеських\s+крон)?\s*$/iu,
    /\s+ve\s+slevě\s+\d+[.,]?\d*\s*(?:CZK|Kč|Kc)?\s*$/iu,
    /\s+so\s+slevou\s+\d+[.,]?\d*\s*(?:CZK|Kč|Kc)?\s*$/iu,
    /\s+v\s+akci\s+za\s+\d+[.,]?\d*\s*(?:Kč|Kc|CZK)\s*$/iu,
    /\s+za\s+akci(?:ní|ni)\s+cen[uy]\s+[^.]{0,80}$/iu,
    /\s+u\s+prod(?:aji|je)\s+za\s+\d+[.,]?\d*\s*(?:Kč|Kc|CZK|крон|чеських\s+крон)?[^.]{0,40}$/iu,
    /\s+v\s+prodeji\s+za\s+\d+[.,]?\d*\s*(?:Kč|Kc|CZK|чеських\s+крон)?[^.]{0,40}$/iu,
    /\s+у\s+продажу\s+за\s+\d+[.,]?\d*\s*(?:Kč|Kc|CZK|крон)?[^.]{0,60}$/iu,
    /\s+у\s+продажу\s+за\s+\d+[.,]?\d*\s*грн?[^.]{0,40}$/iu,
    /\s+к\s+продажу\s+за\s+\d+[.,]?\d*\s*(?:Kč|Kc|CZK)?[^.]{0,60}$/iu,
    /\s+розпродаж\s+[^.]{0,100}\s+за\s+\d+[.,]?\d*\s*(?:Kč|Kc|крон|CZK)[^.]{0,40}$/iu,
  ];
  for (const re of tailRes) {
    t = t.replace(re, "");
  }

  const midNoise = [
    /\s+зі\s+знижкою\s+\d+[.,]?\d*\s*(?:CZK|Kč|Kc|крон|грн)?\s*/giu,
    /\s+з\s+знижкою\s+\d+[.,]?\d*\s*(?:CZK|Kč|Kc)?\s*/giu,
    /\s*(?:se\s+)?slev(?:a|ou|ě)\s+\d+[.,]?\d*\s*(?:CZK|Kč|Kc|чеських\s+крон)?\s*/giu,
    /\s+ve\s+slevě\s+\d+[.,]?\d*\s*(?:CZK|Kč|Kc)?\s*/giu,
  ];
  for (const re of midNoise) {
    t = t.replace(re, " ");
  }

  t = t
    .replace(/\bPOM-B\s*\uFFFD\s*R\b/giu, "POM-BÄR")
    .replace(/\bPOM-BR\b/giu, "POM-BÄR");

  return t.replace(/\s+/g, " ").trim();
}

export function parsePrice(value: string | null): number | null {
  if (!value) return null;

  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function firstMatch(source: string, pattern: RegExp): string | null {
  const match = source.match(pattern);
  return match?.[1] ? decodeHtml(match[1]) : null;
}

export function toIsoDate(day: string, month: string, year: string): string {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function parseCzDateRange(source: string) {
  const fullMatch = source.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4}).*?(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);

  if (fullMatch) {
    return {
      validFrom: toIsoDate(fullMatch[1], fullMatch[2], fullMatch[3]),
      validTo: toIsoDate(fullMatch[4], fullMatch[5], fullMatch[6]),
    };
  }

  const shortMatch = source.match(/(\d{1,2})\.\s*(\d{1,2})\..*?(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);

  if (shortMatch) {
    return {
      validFrom: toIsoDate(shortMatch[1], shortMatch[2], shortMatch[5]),
      validTo: toIsoDate(shortMatch[3], shortMatch[4], shortMatch[5]),
    };
  }

  return {
    validFrom: null,
    validTo: null,
  };
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Extracts weight/volume from unitPrice string (e.g. "1 kg", "500 g", "2 l", "330 ml", "6 ks")
 * and appends it to the title if the title doesn't already contain it.
 *
 * Examples:
 *   appendWeightToTitle("Jogurt bílý", "500 g / 1 kg") → "Jogurt bílý 500 g"
 *   appendWeightToTitle("Mléko 1 l", "1 l")            → "Mléko 1 l"  (already there)
 *   appendWeightToTitle("Kuřecí řízek", null)           → "Kuřecí řízek"
 */
function normalizeWeightString(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/гр(?![\p{L}\p{N}_])/giu, "г")
    .replace(/кг(?![\p{L}\p{N}_])/giu, "kg")
    .replace(/г(?![\p{L}\p{N}_])/giu, "g")
    .replace(/л(?![\p{L}\p{N}_])/giu, "l")
    .replace(/мл(?![\p{L}\p{N}_])/giu, "ml")
    .replace(/activia|danone|zott|olma|milka|pfanner|tiger/gi, "")
    .replace(/u? ?prodeji.*$/i, "")
    .replace(/в продажу.*$/i, "")
    .replace(/у продажу.*$/i, "")
    .replace(/за \d+[.,]?\d*.*$/i, "")
    .replace(/\d+\s?(г|гр|kg|кг|ml|л)/gi, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/шт(?![\p{L}\p{N}_])/giu, "pcs")
    .replace(/пк(?![\p{L}\p{N}_])/giu, "pcs")
    .replace(/[-–]\s*(kg|g|l|ml|cl|dkg|ks|pcs|pack|bal|кг|гр|г|л|мл|шт)(?![\p{L}\p{N}_])/giu, " $1")
    .replace(/(\d)(kg|g|l|ml|cl|dkg|ks|pcs|pack|bal|кг|гр|г|л|мл|шт)(?![\p{L}\p{N}_])/giu, "$1 $2")
    .trim();
}

export function removeDuplicateWeightVariants(value: string): string {
  const pattern = /(\d+(?:[.,]\d+)?\s*[-–]?\s*(?:kg|g|l|ml|cl|dkg|ks|pcs|pack|bal|кг|гр|г|л|мл|шт))(?:$|(?=[^\p{L}\p{N}_]))/giu;
  let result = value.replace(/\u00a0/g, " ");

  let changed = true;
  while (changed) {
    changed = false;
    const matches = Array.from(result.matchAll(pattern));
    if (matches.length < 2) {
      break;
    }

    for (let i = matches.length - 2; i >= 0; i--) {
      const current = matches[i];
      const next = matches[i + 1];
      if (current.index == null || next.index == null) continue;

      const currentNorm = normalizeWeightString(current[0]);
      const nextNorm = normalizeWeightString(next[0]);
      const between = result.slice(current.index + current[0].length, next.index);

      if (currentNorm === nextNorm && /^[\s/,-]*$/u.test(between)) {
        result = result.slice(0, next.index) + result.slice(next.index + next[0].length);
        changed = true;
        break;
      }
    }
  }

  return result;
}

export function normalizeDedupTitle(value: string): string {
  return normalizeWeightString(removeDuplicateWeightVariants(value));
}

export function extractWeightFromString(value: string | null): string | null {
  if (!value) return null;

  const normalized = value.replace(/\s+/g, " ").trim();
  const [firstPart] = normalized.split("/");
  const match = firstPart.match(
    /(\d+(?:[.,]\d+)?\s*[-–]?\s*(?:kg|g|l|ml|cl|dkg|ks|pcs|pack|bal|кг|гр|г|л|мл|шт))(?:$|(?=[^\p{L}\p{N}_]))/iu,
  );

  if (!match) return null;

  return match[1].replace(/[-–]/g, " ").replace(/\s+/g, "\u00a0").trim();
}

export function appendWeightToTitle(title: string, unitPrice: string | null, fallbackSourceTitle?: string | null): string {
  title = removeDuplicateWeightVariants(title.replace(/\u00a0/g, " "));
  const weight = extractWeightFromString(unitPrice) ?? extractWeightFromString(fallbackSourceTitle ?? null);
  if (!weight) return removeDuplicateWeightVariants(title);

  const normalizedTitle = normalizeWeightString(title);
  const normalizedWeight = normalizeWeightString(weight);

  if (normalizedTitle.includes(normalizedWeight)) {
    return removeDuplicateWeightVariants(title);
  }

  return removeDuplicateWeightVariants(`${title} ${weight}`);
}

function repairMojibake(value: string) {
  if (!/[ÃÄÅÐÑ]/.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(value.split("").map((char) => char.charCodeAt(0)));
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return value;
  }
}