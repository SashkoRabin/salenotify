/**
 * Telegram HTML formatting for digest lines, captions, and category listings.
 * Old prices use Unicode U+0336 combining strokes — HTML &lt;s&gt; is often stripped by Telegram for bots.
 */
import { extractWeightFromString, type IngestedOffer } from "./adapters/common.ts";
import type { DigestOffer } from "./digest-types.ts";
import {
  displayDiscountPercent,
  formatDateRange,
  getDaysRemaining,
  PRAGUE_TIMEZONE,
  buildDisplayTitle,
  normalizeAsciiFold,
} from "./digest-model.ts";
import { formatDigestRemainingCompact, formatRemainingDays, type SupportedLanguage } from "./i18n.ts";
import { escapeHtml } from "./telegram.ts";

export function formatDigestHeaderDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PRAGUE_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(date);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return `${day}.${month}`;
}

/** Escaped numeric price for HTML &lt;b&gt; nodes (rounds float noise). */
export function formatDigestPriceNumber(value: number): string {
  const n = Math.round(value * 100) / 100;
  return escapeHtml(String(n));
}

/** Visual strikethrough without HTML tags — Telegram frequently strips strike tags in parsed HTML. */
export function formatDigestStrikeOldPrice(value: number): string {
  const n = Math.round(value * 100) / 100;
  return `<s>${escapeHtml(`${String(n)} CZK`)}</s>`;
}

export function digestHeader(cityName: string, date: Date) {
  return `📍 <b>${escapeHtml(cityName)}</b> · ${escapeHtml(formatDigestHeaderDate(date))}`;
}

export function inferProductEmoji(title: string): string {
  const raw = title.toLowerCase();
  const n = normalizeAsciiFold(title);

  const has = (patterns: string[]) => patterns.some((p) => raw.includes(p) || n.includes(p));

  if (has(["jogurt", "yogurt", "joghurt", "йогурт", "activia", "florian"])) return "🥛";
  if (has(["maso", "vepr", "svin", "hovez", "kruti", "pecen", "steak", "шинк", "мʼясо", "мясо", "ковба"])) return "🥩";
  if (has(["pom-b", "pom b", "brambor", "chips", "lays", "картоп", "закуск"])) return "🥔";
  if (has(["salat", "salát", "салат", "krab"])) return "🥗";
  if (has(["polevk", "polévk", "суп", "maggi", "nudl", "ramen"])) return "🍜";
  if (has(["syr", "hermel", "tvaroh", "сир", "cheese", "camembert", "palou"])) return "🧀";
  if (has(["maslo", "máslo", "олма", "olma", "butter", "масло"])) return "🧈";
  if (has(["pivo", "beer", "gambrin", "kozel", "radegast", "пиво"])) return "🍺";
  if (has(["cokolad", "milka", "шоколад", "choco"])) return "🍫";
  if (has(["ryb", "losos", "tunak", "fish", "риб"])) return "🐟";
  if (has(["vejce", "vajec", "egg", "яйц"])) return "🥚";
  if (has(["mleko", "mléko", "milk", "молок"])) return "🥛";

  return "🛒";
}

/**
 * Caption under the product photo in the store carousel (one message edited via ◀ ▶).
 * Order: title, optional original title, grammage if not already in the title, price, % off, struck old price, validity.
 */
export function formatStoreCarouselProductCaption(
  language: SupportedLanguage,
  offer: DigestOffer,
  displayTitle: string,
  showOriginalTitle: boolean,
  originalTitle: string,
  now: Date,
): string {
  const lines: string[] = [];

  lines.push(`<b>${escapeHtml(displayTitle)}</b>`);
  if (showOriginalTitle) {
    lines.push(`<i>${escapeHtml(originalTitle)}</i>`);
  }

  const weightFromUnit = extractWeightFromString(offer.unitPrice)?.replace(/\u00a0/g, " ") ?? null;
  const titleFlat = displayTitle.replace(/\s+/g, " ");
  const gramInTitle = weightFromUnit &&
    titleFlat.toLowerCase().includes(weightFromUnit.toLowerCase().replace(/\s+/g, " "));
  if (weightFromUnit && !gramInTitle) {
    lines.push(`⚖️ ${escapeHtml(weightFromUnit)}`);
  }

  if (offer.priceCurrent !== null) {
    lines.push(`💰 <b>${formatDigestPriceNumber(offer.priceCurrent)} CZK</b>`);
  }

  const pct = displayDiscountPercent(offer);
  if (pct !== null) {
    lines.push(`🔻 <b>−${escapeHtml(String(pct))}%</b>`);
  }

  if (
    offer.priceOriginal !== null &&
    offer.priceCurrent != null &&
    offer.priceOriginal > offer.priceCurrent
  ) {
    lines.push(`🏷 ${formatDigestStrikeOldPrice(offer.priceOriginal)}`);
  }

  const remaining = getDaysRemaining(offer.validTo, now);
  if (remaining) {
    lines.push(`⏳ ${escapeHtml(formatRemainingDays(language, remaining))}`);
  }

  const range = formatDateRange(offer.validFrom, offer.validTo);
  if (range) {
    lines.push(`📅 ${escapeHtml(range)}`);
  }

  return lines.join("\n");
}

export function formatMetaLine(
  language: SupportedLanguage,
  offer: DigestOffer,
  now: Date,
) {
  const parts: string[] = [];

  if (offer.priceCurrent !== null) {
    let pricePart = `💰 <b>${formatDigestPriceNumber(offer.priceCurrent)} CZK</b>`;
    if (offer.priceOriginal !== null) {
      pricePart += ` ${formatDigestStrikeOldPrice(offer.priceOriginal)}`;
    }
    parts.push(pricePart);
  }

  const pct = displayDiscountPercent(offer);
  if (pct !== null) {
    parts.push(`🔻 ${escapeHtml(String(pct))}%`);
  }

  const remaining = getDaysRemaining(offer.validTo, now);
  if (remaining) {
    parts.push(`⏳ ${escapeHtml(formatRemainingDays(language, remaining))}`);
  }

  return parts.join("   ");
}

export function formatPremiumOfferLines(
  language: SupportedLanguage,
  offer: IngestedOffer,
  translatedTitle: string,
  now: Date,
): string[] {
  const displayTitle = buildDisplayTitle(offer, translatedTitle);
  const emoji = inferProductEmoji(displayTitle);
  const lines: string[] = [`• ${emoji} <b>${escapeHtml(displayTitle)}</b>`];

  if (offer.priceCurrent !== null) {
    let priceLine = `  💰 <b>${formatDigestPriceNumber(offer.priceCurrent)}</b> CZK`;
    if (offer.priceOriginal !== null) {
      priceLine += ` · ${formatDigestStrikeOldPrice(offer.priceOriginal)}`;
    }
    lines.push(priceLine);
  }

  const pct = displayDiscountPercent(offer);
  const remaining = getDaysRemaining(offer.validTo, now);
  const meta: string[] = [];
  if (pct !== null) {
    meta.push(`🔻 <b>−${escapeHtml(String(pct))}%</b>`);
  }
  if (remaining !== null) {
    meta.push(`⏳ ${escapeHtml(formatDigestRemainingCompact(language, remaining))}`);
  }
  if (meta.length > 0) {
    lines.push(`  ${meta.join(" • ")}`);
  }

  return lines;
}
