import {
  appendWeightToTitle,
  decodeHtml,
  extractWeightFromString,
  parsePrice,
  sanitizeOfferTitleForDisplay,
  slugify,
  type IngestedOffer,
} from "./common.ts";
import { getCategoryKeyFromText } from "../categories.ts";

type KupiChainConfig = {
  code: "albert" | "billa" | "lidl" | "penny";
  brand: string;
  pageTitle: string;
  /** `data-shop` value on kupi.cz product detail page for this chain */
  detailShopLabel: string;
  urls: string[];
};

const PRAGUE_TIMEZONE = "Europe/Prague";

const KUPI_BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "cs-CZ,cs;q=0.9,en-GB;q=0.8,en;q=0.7",
};

const KUPI_CHAIN_CONFIG: Record<KupiChainConfig["code"], KupiChainConfig> = {
  albert: {
    code: "albert",
    brand: "Albert",
    pageTitle: "Albert",
    detailShopLabel: "Albert",
    urls: [
      "https://www.kupi.cz/letaky/albert",
    ],
  },
  billa: {
    code: "billa",
    brand: "BILLA",
    pageTitle: "BILLA",
    detailShopLabel: "BILLA",
    urls: [
      "https://www.kupi.cz/letaky/billa",
    ],
  },
  lidl: {
    code: "lidl",
    brand: "Lidl",
    pageTitle: "Lidl",
    detailShopLabel: "Lidl",
    urls: [
      "https://www.kupi.cz/letaky/lidl",
    ],
  },
  penny: {
    code: "penny",
    brand: "PENNY",
    pageTitle: "Penny Market",
    detailShopLabel: "Penny Market",
    urls: [
      "https://www.kupi.cz/letaky/penny-market",
      "https://www.kupi.cz/letaky/penny",
    ],
  },
};

function formatPragueDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PRAGUE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function stripHtmlToText(html: string) {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return decodeHtml(cleaned);
}

function parseCzShortDate(day: string, month: string, now: Date) {
  const currentYear = Number(new Intl.DateTimeFormat("en-CA", {
    timeZone: PRAGUE_TIMEZONE,
    year: "numeric",
  }).format(now).slice(0, 4));

  return `${currentYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseKupiValidity(text: string, now: Date) {
  const rangeMatch = text.match(
    /plat[ií][^0-9]{0,40}(\d{1,2})\.\s*(\d{1,2})\.\s*[–-]\s*[^0-9]{0,20}(\d{1,2})\.\s*(\d{1,2})\./iu,
  );

  if (rangeMatch) {
    return {
      validFrom: parseCzShortDate(rangeMatch[1], rangeMatch[2], now),
      validTo: parseCzShortDate(rangeMatch[3], rangeMatch[4], now),
    };
  }

  const untilMatch = text.match(/plat[ií]\s+do[^0-9]{0,30}(\d{1,2})\.\s*(\d{1,2})\./iu);

  if (untilMatch) {
    return {
      validFrom: formatPragueDate(now),
      validTo: parseCzShortDate(untilMatch[1], untilMatch[2], now),
    };
  }

  return {
    validFrom: null,
    validTo: null,
  };
}

function extractProductSection(text: string, pageTitle: string) {
  const haystack = text.toLowerCase();
  const marker = `akční zboží v ${pageTitle.toLowerCase()}`;
  const start = haystack.indexOf(marker);

  if (start === -1) {
    return text;
  }

  return text.slice(start);
}

const KUPI_BASE_URL = "https://www.kupi.cz";

function shouldRejectCandidate(title: string) {
  const lower = title.toLowerCase();
  const banned = [
    "akční zboží",
    "leták",
    "akce",
    "otevírací doba",
    "obchody",
    "obchod",
    "prodejna",
    "slevy",
    "kupi cz",
    "archiv",
    "více",
    "zobrazit",
    "platí",
  ];

  return title.length < 4 || title.length > 140 || banned.some((item) => lower.includes(item));
}

type KupiProductEntry = {
  html: string;
  title: string;
  href: string | null;
  price: string;
};

function extractProductEntriesFromHtml(html: string): KupiProductEntry[] {
  const entries: KupiProductEntry[] = [];
  const anchorPattern = /<a\b[^>]*\bclass=["'][^"']*\bitem_content\b[^"']*\bdiscount_item\b[^"']*\btop_discounts\b[^"']*["'][^>]*>[\s\S]*?<\/a>/giu;

  for (const match of html.matchAll(anchorPattern)) {
    const anchor = match[0];
    const titleMatch = anchor.match(/\btitle=["']([^"']+)["']/i);
    const hrefMatch = anchor.match(/\bhref=["']([^"']+)["']/i);
    const priceMatch = anchor.match(/od\s*(?:<span[^>]*>)?\s*(\d{1,4},\d{2})\s*K(?:č|Ä)(?:[^<]*<\/span>)?/i)
      ?? anchor.match(/od\s*(?:<strong[^>]*>)?\s*(\d{1,4},\d{2})\s*(?:&nbsp;)?K(?:č|Ä)(?:[^<]*<\/strong>)?/i)
      ?? anchor.match(/od\s*(\d{1,4},\d{2})\s*K(?:č|Ä)/i);

    if (!titleMatch || !priceMatch) {
      continue;
    }

    entries.push({
      html: anchor,
      title: decodeHtml(titleMatch[1]).replace(/\s+/g, " ").trim(),
      href: hrefMatch?.[1] ?? null,
      price: priceMatch[1],
    });
  }

  return entries;
}

type KupiDetailPayload = {
  unitPrice: string | null;
  discountPercent: number | null;
  detailShelfPrice: number | null;
};

function parseKupiDetailPricesForShop(html: string, shopLabel: string) {
  const esc = shopLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`data-shop="${esc}"`, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const idx = match.index;
    const slice = html.slice(Math.max(0, idx - 400), idx + 6000);
    if (!/discount_price_value/i.test(slice)) {
      continue;
    }

    const priceBlock =
      slice.match(/<strong[^>]*\bclass="[^"]*\bdiscount_price_value\b[^"]*"[^>]*>([\s\S]*?)<\/strong>/i)?.[1]
      ?? slice.match(/\bclass="[^"]*\bdiscount_price_value\b[^"]*"[^>]*>([\s\S]*?)<\/strong>/i)?.[1]
      ?? slice.match(/discount_price_value[^>]*>([\s\S]*?)<\/strong>/i)?.[1];

    const pctBlock =
      slice.match(/<div[^>]*\bclass="[^"]*\bdiscount_percentage\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]
      ?? slice.match(/\bclass="[^"]*\bdiscount_percentage\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]
      ?? slice.match(/discount_percentage[^>]*>([\s\S]*?)<\/div>/i)?.[1];

    const priceText = decodeHtml(priceBlock ?? "").replace(/<[^>]+>/g, " ").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    const detailShelfPrice = parsePrice(priceText.replace(/[^\d,.-]/g, "")) ?? parsePrice(priceText);

    const pctText = decodeHtml(pctBlock ?? "").replace(/<[^>]+>/g, " ").replace(/\u00a0/g, " ").replace(/\s+/g, " ");
    const pctMatch = pctText.match(/(\d{1,3})\s*%/);
    const discountPercent = pctMatch ? Number(pctMatch[1]) : null;

    if (discountPercent != null && discountPercent > 0 && discountPercent < 100) {
      return { discountPercent, detailShelfPrice };
    }
  }

  return { discountPercent: null, detailShelfPrice: null };
}

function parseKupiDetailWeightFromHtml(html: string): string | null {
  const blindMatch = html.match(/<h2[^>]*class=["']blind["'][^>]*>([^<]+)<\/h2>/i);
  if (blindMatch) {
    const weight = extractWeightFromString(blindMatch[1]);
    if (weight) return weight;
  }

  for (const match of html.matchAll(/<div[^>]*class=["']discount_amount["'][^>]*>([\s\S]*?)<\/div>/gi)) {
    const weight = extractWeightFromString(match[1]);
    if (weight) return weight;
  }

  for (const match of html.matchAll(/data-key=["']([^"']+)["']/gi)) {
    const weight = extractWeightFromString(match[1]);
    if (weight && weight.toLowerCase() !== "vse") {
      return weight;
    }
  }

  return null;
}

function emptyKupiDetail(): KupiDetailPayload {
  return { unitPrice: null, discountPercent: null, detailShelfPrice: null };
}

async function fetchKupiProductDetail(
  productPath: string | null,
  shopLabel: string,
  cache: Map<string, KupiDetailPayload>,
): Promise<KupiDetailPayload> {
  if (!productPath) {
    return emptyKupiDetail();
  }

  const url = new URL(productPath, KUPI_BASE_URL).href;
  const cacheKey = `${url}::${shopLabel}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  try {
    const response = await fetch(url, { headers: KUPI_BROWSER_HEADERS });
    if (!response.ok) {
      cache.set(cacheKey, emptyKupiDetail());
      return emptyKupiDetail();
    }

    const html = await response.text();
    const unitPrice = parseKupiDetailWeightFromHtml(html);
    const { discountPercent, detailShelfPrice } = parseKupiDetailPricesForShop(html, shopLabel);
    const payload: KupiDetailPayload = { unitPrice, discountPercent, detailShelfPrice };
    cache.set(cacheKey, payload);
    return payload;
  } catch {
    const payload = emptyKupiDetail();
    cache.set(cacheKey, payload);
    return payload;
  }
}

const KUPI_DETAIL_CONCURRENCY = 6;

async function buildOfferFromKupiEntry(
  entry: KupiProductEntry,
  config: KupiChainConfig,
  validity: { validFrom: string | null; validTo: string | null },
  detailCache: Map<string, KupiDetailPayload>,
): Promise<{ offer: IngestedOffer; key: string } | null> {
  const rawTitle = sanitizeOfferTitleForDisplay(entry.title);
  let unitPrice = extractWeightFromString(rawTitle);

  const detail = await fetchKupiProductDetail(entry.href, config.detailShopLabel, detailCache);
  if (!unitPrice) {
    unitPrice = detail.unitPrice ?? null;
  }

  const title = sanitizeOfferTitleForDisplay(appendWeightToTitle(rawTitle, unitPrice, rawTitle));
  const priceCurrent = parsePrice(entry.price);

  let priceOriginal: number | null = null;
  let discountPercent: number | null = null;
  if (priceCurrent !== null && detail.discountPercent != null && detail.discountPercent > 0 && detail.discountPercent < 98) {
    discountPercent = detail.discountPercent;
    priceOriginal = Math.round((priceCurrent / (1 - discountPercent / 100)) * 100) / 100;
  }

  if (!title || priceCurrent === null || shouldRejectCandidate(title)) {
    return null;
  }

  const key = `${slugify(title)}:${priceCurrent}`;

  const offer: IngestedOffer = {
    externalOfferId: `${config.code}:${key}`,
    title,
    brand: config.brand,
    category: "TopOffer",
    categoryKey: getCategoryKeyFromText(title),
    priceCurrent,
    priceOriginal,
    discountPercent,
    unitPrice,
    imageUrl: null,
    sourceUrl: config.urls[0],
    sourceType: "kupi_chain_page",
    validFrom: validity.validFrom,
    validTo: validity.validTo,
    scope: "national",
    rawPayload: {
      source: "kupi.cz",
      productUrl: entry.href ? new URL(entry.href, KUPI_BASE_URL).href : config.urls[0],
      snippet: entry.html,
      unitPrice,
      kupiDetailShop: config.detailShopLabel,
      kupiDetailShelfPrice: detail.detailShelfPrice,
      kupiDetailDiscountPercent: detail.discountPercent,
    },
  };

  return { offer, key };
}

async function parseProductEntries(section: string, config: KupiChainConfig, validity: { validFrom: string | null; validTo: string | null }) {
  const entries = extractProductEntriesFromHtml(section);
  const seen = new Set<string>();
  const offers: IngestedOffer[] = [];
  const detailCache = new Map<string, KupiDetailPayload>();

  for (let i = 0; i < entries.length; i += KUPI_DETAIL_CONCURRENCY) {
    const chunk = entries.slice(i, i + KUPI_DETAIL_CONCURRENCY);
    const built = await Promise.all(
      chunk.map((entry) => buildOfferFromKupiEntry(entry, config, validity, detailCache)),
    );

    for (const raw of built) {
      if (!raw) continue;
      if (seen.has(raw.key)) continue;
      seen.add(raw.key);
      offers.push(raw.offer);
    }
  }

  return offers;
}

export async function fetchKupiChainOffers(chainCode: KupiChainConfig["code"], limit = 12): Promise<IngestedOffer[]> {
  const config = KUPI_CHAIN_CONFIG[chainCode];
  const now = new Date();
  let lastError: Error | null = null;

  for (const url of config.urls) {
    try {
      const response = await fetch(url, { headers: KUPI_BROWSER_HEADERS });

      if (!response.ok) {
        throw new Error(`${config.brand} kupi fetch failed: ${response.status}`);
      }

      const html = await response.text();
      const text = stripHtmlToText(html);
      const validity = parseKupiValidity(text, now);
      const offers = await parseProductEntries(html, config, validity);

      if (offers.length > 0) {
        return offers.slice(0, limit);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (lastError) {
    throw lastError;
  }

  return [];
}