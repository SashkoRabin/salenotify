import { appendWeightToTitle, decodeHtml, firstMatch, parsePrice, removeDuplicateWeightVariants, type IngestedOffer } from "./common.ts";
import { getCategoryFromSourceCode, getCategoryKeyFromText } from "../categories.ts";

const KAUFLAND_LEAFLETS_URL = "https://prodejny.kaufland.cz/letak.html";
const KAUFLAND_CATEGORY_CODES = [
  "0001_TopArticle",
  "01_Maso__drůbež__uzeniny",
  "02_Ovoce__zelenina__rostliny",
  "03_Mléčné_výrobky__tuky__vejce",
  "05_Lahůdky__konzervy",
  "06_Základní_potraviny__pečivo",
  "07_Káva__čaj_cukrovinky__slané_pochoutky",
  "08_Nápoje__lihoviny",
  "09_Drogerie__dětská_výživa_a_péče__krmiva",
] as const;

const KAUFLAND_PRIORITY_PATTERNS = [
  { weight: 340, patterns: ["vejce", "vajec"] },
  { weight: 300, patterns: ["maso", "kure", "kureci", "veprove", "hovezi", "drubez", "uzeniny"] },
  { weight: 280, patterns: ["mlecne", "mleko", "jogurt", "syr", "tvaroh", "maslo", "smetana"] },
  { weight: 250, patterns: ["napoj", "pivo", "vino", "kofola", "limonad"] },
  { weight: 230, patterns: ["cisticka", "papir", "taska", "cisteni", "sanitni"] },
  { weight: 220, patterns: ["ovoce", "jablko", "pomeranc", "banan", "mrkev"] },
] as const;

function buildKauflandCategoryUrl(categoryCode: string) {
  const url = new URL("https://prodejny.kaufland.cz/nabidka/prehled.html");
  url.searchParams.set("kloffer-week", "current");
  url.searchParams.set("kloffer-category", categoryCode);
  return url.toString();
}

function buildKauflandOverviewUrl() {
  const url = new URL("https://prodejny.kaufland.cz/nabidka/prehled.html");
  url.searchParams.set("kloffer-week", "current");
  return url.toString();
}

function extractLeafletValidity(html: string) {
  const match = html.match(
    /data-aa-detail="(\d{2}\.\d{2}\.\d{4}) - (\d{2}\.\d{2}\.\d{4})_Kaufland"/,
  );

  if (!match) {
    return { validFrom: null, validTo: null, leafletUrl: null };
  }

  const [dayFrom, monthFrom, yearFrom] = match[1].split(".");
  const [dayTo, monthTo, yearTo] = match[2].split(".");
  const leafletUrl =
    html.match(/data-download-url="([^"]+Kaufland-[^"]+\.pdf)"/)?.[1] ?? null;

  return {
    validFrom: `${yearFrom}-${monthFrom}-${dayFrom}`,
    validTo: `${yearTo}-${monthTo}-${dayTo}`,
    leafletUrl,
  };
}

function extractTiles(offersHtml: string) {
  const tilePattern = /<a class="k-product-tile"[\s\S]*?<\/a><!--\]-->/g;
  return offersHtml.match(tilePattern) ?? [];
}

function normalizePriorityValue(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeKauflandOfferKey(value: string) {
  const cleaned = decodeHtml(value)
    .replace(/\s*(\d+(?:[.,]\d+)?\s*(?:kg|g|l|ml|cl|dkg|ks|pcs|pack|bal|кг|гр|г|л|мл|шт))\b/gi, "")
    .trim();

  return removeDuplicateWeightVariants(cleaned)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function scoreKauflandOffer(offer: IngestedOffer) {
  const discount = Math.abs(offer.discountPercent ?? 0);
  const normalized = normalizePriorityValue(`${offer.title} ${offer.category ?? ""}`);
  let keywordScore = 0;

  if (discount >= 20) {
    for (const group of KAUFLAND_PRIORITY_PATTERNS) {
      if (group.patterns.some((pattern) => normalized.includes(pattern))) {
        keywordScore += group.weight;
      }
    }
  }

  return discount * 1000 + keywordScore;
}

function buildOfferFromTile(
  tile: string,
  index: number,
  sourcePage: string,
  categoryCode: string,
  validity: { validFrom: string | null; validTo: string | null; leafletUrl: string | null },
): IngestedOffer {
  const brand = firstMatch(tile, /<div class="k-product-tile__title">([\s\S]*?)<\/div>/);
  const subtitle = firstMatch(tile, /<div class="k-product-tile__subtitle">([\s\S]*?)<\/div>/);
  const unitPrice = firstMatch(tile, /<div class="k-product-tile__unit-price">([\s\S]*?)<\/div>/);
  const discountLabel = firstMatch(tile, /<div class="k-price-tag__discount">([\s\S]*?)<\/div>/);
  const priceCurrent = parsePrice(firstMatch(tile, /<div class="k-price-tag__price">([\d,\s]+)</));
  const priceOriginal = parsePrice(
    firstMatch(tile, /<span class="k-price-tag__old-price-line-through">([\d,\s]+)<\/span>/),
  );
  const imageUrl = firstMatch(tile, /<img class="k-image k-product-tile__main-image" src="([^"]+)"/);
  const promo = firstMatch(tile, /<div class="k-product-tile__promo">([\s\S]*?)<\/div>/);
  const discountPercent = discountLabel?.startsWith("-")
    ? Math.abs(parsePrice(discountLabel.replace("%", "")) ?? 0)
    : priceOriginal && priceCurrent
      ? Math.round(((priceOriginal - priceCurrent) / priceOriginal) * 100)
      : null;

  const rawTitle = [brand, subtitle].filter(Boolean).join(" ").trim() || `Kaufland offer ${index + 1}`;
  const title = appendWeightToTitle(rawTitle, unitPrice);
  const normalizedTitleKey = normalizeKauflandOfferKey(rawTitle);
  const externalOfferId = [`kaufland`, normalizedTitleKey, String(priceCurrent ?? "na")].join(":");

  const inferredCategory = getCategoryFromSourceCode(categoryCode, "kaufland") ?? getCategoryKeyFromText(rawTitle);

  return {
    externalOfferId,
    title,
    brand,
    category: categoryCode,
    categoryKey: inferredCategory,
    priceCurrent,
    priceOriginal,
    discountPercent,
    unitPrice,
    imageUrl,
    sourceUrl: validity.leafletUrl ?? sourcePage,
    sourceType: validity.leafletUrl ? "kaufland_html_plus_leaflet" : "kaufland_html",
    validFrom: validity.validFrom,
    validTo: validity.validTo,
    scope: "national",
    rawPayload: {
      promo,
      discountLabel,
      unitPrice,
      imageUrl,
      sourcePage,
      categoryCode,
    },
  };
}

type KauflandSsrOffer = {
  offerId?: string;
  dateFrom?: string;
  dateTo?: string;
  title?: string;
  subtitle?: string;
  price?: number;
  discount?: number;
  unit?: string;
  detailTitle?: string;
  detailDescription?: string;
  listImage?: string;
  formattedOldPrice?: string;
  formattedPrice?: string;
};

type KauflandSsrCategory = {
  name?: string;
  displayName?: string;
  dateFrom?: string;
  dateTo?: string;
  offers?: KauflandSsrOffer[];
};

function extractOfferTemplateJson(html: string) {
  const marker = 'window.SSR[';
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const assignmentIndex = html.indexOf('{"component":"OfferTemplate"', markerIndex);
  if (assignmentIndex === -1) {
    return null;
  }

  const scriptCloseIndex = html.indexOf("</script>", assignmentIndex);
  if (scriptCloseIndex === -1) {
    return null;
  }

  const jsonSource = html.slice(assignmentIndex, scriptCloseIndex).trim().replace(/;$/, "");

  try {
    return JSON.parse(jsonSource);
  } catch (error) {
    console.error("Failed to parse Kaufland SSR JSON", error);
    return null;
  }
}

function buildOfferFromSsr(
  offer: KauflandSsrOffer,
  category: KauflandSsrCategory,
  sourcePage: string,
): IngestedOffer | null {
  const rawTitle = [offer.title, offer.subtitle].filter(Boolean).join(" ").trim();
  if (!rawTitle || !offer.offerId) {
    return null;
  }

  const unitPrice = offer.unit?.trim() || null;
  const title = appendWeightToTitle(rawTitle, unitPrice, offer.detailTitle ?? rawTitle);
  const priceCurrent = typeof offer.price === "number" ? offer.price : parsePrice(offer.formattedPrice ?? null);
  const priceOriginal = parsePrice(offer.formattedOldPrice ?? null);
  const discountPercent = typeof offer.discount === "number"
    ? Math.abs(offer.discount)
    : priceOriginal && priceCurrent
      ? Math.round(((priceOriginal - priceCurrent) / priceOriginal) * 100)
      : null;
  const categoryCode = category.name ?? "overview";
  const categoryKey = getCategoryFromSourceCode(categoryCode, "kaufland") ?? getCategoryKeyFromText(rawTitle);

  return {
    externalOfferId: offer.offerId,
    title,
    brand: offer.title?.trim() ?? null,
    category: categoryCode,
    categoryKey,
    priceCurrent,
    priceOriginal,
    discountPercent,
    unitPrice,
    imageUrl: offer.listImage ?? null,
    sourceUrl: sourcePage,
    sourceType: "kaufland_ssr",
    validFrom: offer.dateFrom ?? category.dateFrom ?? null,
    validTo: offer.dateTo ?? category.dateTo ?? null,
    scope: "national",
    rawPayload: {
      categoryCode,
      categoryDisplayName: category.displayName ?? null,
      detailTitle: offer.detailTitle ?? null,
      detailDescription: offer.detailDescription ?? null,
      formattedOldPrice: offer.formattedOldPrice ?? null,
      formattedPrice: offer.formattedPrice ?? null,
      unitPrice,
      imageUrl: offer.listImage ?? null,
      sourcePage,
    },
  };
}

function extractOffersFromSsr(html: string, sourcePage: string, todayIso: string) {
  const payload = extractOfferTemplateJson(html);
  const categories = payload?.props?.offerData?.cycles?.flatMap((cycle: { categories?: KauflandSsrCategory[] }) =>
    cycle.categories ?? []
  ) ?? [];

  const offers = new Map<string, IngestedOffer>();

  for (const category of categories) {
    for (const entry of category.offers ?? []) {
      const built = buildOfferFromSsr(entry, category, sourcePage);
      if (!built) continue;

      const validFrom = built.validFrom ?? "0000-00-00";
      const validTo = built.validTo ?? "9999-12-31";
      if (validFrom > todayIso || validTo < todayIso) {
        continue;
      }

      offers.set(built.externalOfferId, built);
    }
  }

  return Array.from(offers.values());
}

export async function fetchKauflandOffers(limit = 48): Promise<IngestedOffer[]> {
  const effectiveLimit = Math.max(limit, 320); // Back to 320 - source categories ensure quality
  const todayIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const pageRequests = [
    {
      categoryCode: "overview",
      url: buildKauflandOverviewUrl(),
    },
    ...KAUFLAND_CATEGORY_CODES.map((categoryCode) => ({
      categoryCode,
      url: buildKauflandCategoryUrl(categoryCode),
    })),
  ].map(({ categoryCode, url }) => {
    return fetch(url).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Kaufland offers fetch failed for ${categoryCode}: ${response.status}`);
      }

      return {
        categoryCode,
        sourcePage: url,
        html: await response.text(),
      };
    });
  });

  const [pages, leafletsResponse] = await Promise.all([
    Promise.all(pageRequests),
    fetch(KAUFLAND_LEAFLETS_URL),
  ]);

  if (!leafletsResponse.ok) {
    throw new Error(`Kaufland leaflets fetch failed: ${leafletsResponse.status}`);
  }

  const leafletsHtml = await leafletsResponse.text();
  const validity = extractLeafletValidity(leafletsHtml);
  const offers = new Map<string, IngestedOffer>();

  for (const page of pages) {
    const ssrOffers = extractOffersFromSsr(page.html, page.sourcePage, todayIso);
    if (ssrOffers.length > 0) {
      ssrOffers.forEach((offer) => offers.set(offer.externalOfferId, offer));
    }
  }

  if (offers.size > 0) {
    return Array.from(offers.values())
      .sort((left, right) => scoreKauflandOffer(right) - scoreKauflandOffer(left))
      .slice(0, effectiveLimit);
  }

  for (const page of pages) {
    const tiles = extractTiles(page.html);

    tiles.forEach((tile, index) => {
      const offer = buildOfferFromTile(tile, index, page.sourcePage, page.categoryCode, validity);
      offers.set(offer.externalOfferId, offer);
    });
  }

  return Array.from(offers.values())
    .sort((left, right) => scoreKauflandOffer(right) - scoreKauflandOffer(left))
    .slice(0, effectiveLimit);
}
