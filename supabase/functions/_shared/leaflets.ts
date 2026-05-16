import type { IngestedOffer } from "./adapters/common.ts";
import { formatDateRange } from "./digest-model.ts";
import { fetchOffersForChain } from "./offers.ts";
import { escapeHtml } from "./telegram.ts";
import { t, type SupportedLanguage } from "./i18n.ts";

export type LeafletPage = {
  chainCode: string;
  chainName: string;
  leafletId: string;
  leafletTitle: string;
  imageUrl: string;
  sourceUrl: string;
  pageIndex: number;
  pageCount: number;
  validFrom: string | null;
  validTo: string | null;
};

const LEAFLET_CACHE_TTL_MS = 60 * 60 * 1000;
const leafletPagesCache = new Map<string, { expiresAt: number; pages: LeafletPage[] }>();
const SCHWARZ_API_URL = "https://endpoints.leaflets.schwarz/v4/flyer";
const PRIMARY_SYNTHETIC_LEAFLET_CHAINS = new Set(["kaufland", "lidl", "albert", "billa", "penny"]);
const KUPI_LEAFLET_LISTING_BY_CHAIN: Record<string, string> = {
  lidl: "https://www.kupi.cz/letaky/lidl",
  albert: "https://www.kupi.cz/letaky/albert",
  billa: "https://www.kupi.cz/letaky/billa",
  penny: "https://www.kupi.cz/letaky/penny-market",
};
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "cs-CZ,cs;q=0.9,en;q=0.8",
};

function isSchwarzViewerUrl(url: string) {
  return url.includes("leaflets.kaufland.com")
    || url.includes("lidl.leaflets.schwarz")
    || url.includes("www.lidl.cz/l/");
}

function leafletPageLabel(language: SupportedLanguage, current: number, total: number) {
  switch (language) {
    case "uk":
      return `Стор. ${current} із ${total}`;
    case "cs":
      return `Str. ${current} z ${total}`;
    case "en":
      return `Page ${current} of ${total}`;
    case "ru":
    default:
      return `Стр. ${current} из ${total}`;
  }
}

function leafletIssueLabel(language: SupportedLanguage, current: number, total: number) {
  switch (language) {
    case "uk":
      return `Летак ${current} із ${total}`;
    case "cs":
      return `Letak ${current} z ${total}`;
    case "en":
      return `Leaflet ${current} of ${total}`;
    case "ru":
    default:
      return `Летак ${current} из ${total}`;
  }
}

function leafletDateLabel(language: SupportedLanguage, range: string) {
  switch (language) {
    case "uk":
      return `Актуально: ${range}`;
    case "cs":
      return `Platnost: ${range}`;
    case "en":
      return `Valid: ${range}`;
    case "ru":
    default:
      return `Действует: ${range}`;
  }
}

function isLeafletOffer(offer: IngestedOffer) {
  return offer.sourceType.toLowerCase().includes("leaflet")
    || (offer.category ?? "").toLowerCase().includes("leaflet");
}

function normalizePageUrl(url: string, pageIndex: number) {
  return url.replace(/\/ar\/\d+/i, `/ar/${pageIndex}`);
}

function normalizePublitasPageUrl(url: string, pageNumber: number) {
  if (/\/page\/\d+/i.test(url)) {
    return url.replace(/\/page\/\d+/i, `/page/${pageNumber}`);
  }

  return `${url.replace(/\/+$/u, "")}/page/${pageNumber}`;
}

function absolutizeUrl(url: string | null, baseUrl?: string) {
  if (!url) {
    return null;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (baseUrl) {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }

  return url;
}

function extractOgImage(html: string) {
  return absolutizeUrl(
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
      ?? null,
  );
}

function extractLeafletImage(html: string) {
  return absolutizeUrl(
    html.match(/data-leaflet-image[\s\S]{0,200}?src=["']([^"']+)["']/i)?.[1]
      ?? html.match(/class=["'][^"']*flyer__image[^"']*["'][^>]+src=["']([^"']+)["']/i)?.[1]
      ?? extractOgImage(html),
  );
}

function parseLooseCzDateRange(text: string) {
  const fullMatch = text.match(
    /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4}).{0,40}?(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/u,
  );

  if (fullMatch) {
    return {
      validFrom: `${fullMatch[3]}-${fullMatch[2].padStart(2, "0")}-${fullMatch[1].padStart(2, "0")}`,
      validTo: `${fullMatch[6]}-${fullMatch[5].padStart(2, "0")}-${fullMatch[4].padStart(2, "0")}`,
    };
  }

  return { validFrom: null, validTo: null };
}

function extractOgTitle(html: string) {
  return html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]
    ?? html.match(/<title>([^<]+)<\/title>/i)?.[1]
    ?? null;
}

function extractPublitasPageCount(html: string) {
  const match = html.match(/"numPages":(\d{1,4})/i);
  if (!match) {
    return null;
  }

  const count = Number(match[1]);
  return Number.isFinite(count) && count > 0 ? count : null;
}

function extractPublitasPageImage(html: string, pageUrl: string) {
  const screenshotMatch = html.match(/"at600":"([^"]+)"/i)
    ?? html.match(/"at800":"([^"]+)"/i)
    ?? html.match(/"at1000":"([^"]+)"/i);

  if (screenshotMatch) {
    return absolutizeUrl(
      screenshotMatch[1]
        .replace(/\\u0026/g, "&")
        .replace(/\\\//g, "/"),
      pageUrl,
    );
  }

  return extractOgImage(html);
}

function extractPublitasTitle(html: string) {
  return html.match(/"publicationTitle":"([^"]+)"/i)?.[1]
    ?.replace(/\\u0026/g, "&")
    ?.replace(/\\\//g, "/")
    ?? extractOgTitle(html);
}

function extractHrefMatches(html: string, pattern: RegExp) {
  return Array.from(html.matchAll(pattern))
    .map((match) => match[1] ?? match[0])
    .filter(Boolean);
}

function uniqueUrls(urls: string[]) {
  return Array.from(new Set(urls));
}

function pickBestKupiLeafletUrl(chainCode: string, urls: string[]) {
  const scored = urls.map((url, index) => {
    const lowerUrl = url.toLowerCase();
    let score = 0;

    if (!lowerUrl.includes("katalog")) {
      score += 30;
    }
    if (!lowerUrl.includes("zahrada")) {
      score += 25;
    }
    if (!lowerUrl.includes("gril")) {
      score += 20;
    }
    if (!lowerUrl.includes("spotrebniho-zbozi")) {
      score += 15;
    }

    if (chainCode === "billa" && lowerUrl.includes("velky-letak")) {
      score += 40;
    }
    if (chainCode === "albert" && lowerUrl.includes("hypermarket")) {
      score += 35;
    }
    if (chainCode === "albert" && lowerUrl.includes("supermarket")) {
      score += 20;
    }
    if (chainCode === "lidl" && lowerUrl.includes("letak-od-ctvrtka")) {
      score += 35;
    }
    if (chainCode === "lidl" && lowerUrl.includes("letak-od-pondeli")) {
      score += 25;
    }
    if (chainCode === "penny" && lowerUrl.includes("penny-market-letak-")) {
      score += 35;
    }

    return { url, score, index };
  });

  scored.sort((left, right) => right.score - left.score || left.index - right.index);
  return scored[0]?.url ?? null;
}

function extractKupiPageImages(html: string) {
  const pageImages = new Map<number, string>();
  const matches = html.matchAll(/(https?:\/\/)?img\.kupi\.cz\/letaky\/[^"' ]*?-(\d+)_(1000|1500)\.jpg/gi);

  for (const match of matches) {
    const rawUrl = match[0];
    const pageNumber = Number(match[2]);
    const imageSize = Number(match[3]);
    if (!Number.isFinite(pageNumber) || pageNumber <= 0) {
      continue;
    }

    const normalizedUrl = absolutizeUrl(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    if (!normalizedUrl) {
      continue;
    }

    const currentUrl = pageImages.get(pageNumber);
    if (!currentUrl || imageSize === 1000) {
      pageImages.set(pageNumber, normalizedUrl);
    }
  }

  return Array.from(pageImages.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([pageNumber, imageUrl]) => ({ pageNumber, imageUrl }));
}

async function resolveKupiLeafletPages(
  chainCode: string,
  chainName: string,
) {
  const listingUrl = KUPI_LEAFLET_LISTING_BY_CHAIN[chainCode];
  if (!listingUrl) {
    return [];
  }

  const listingHtml = await fetchHtml(listingUrl);
  const detailUrls = uniqueUrls(
    extractHrefMatches(listingHtml, /href=["']((?:https:\/\/www\.kupi\.cz)?\/letak\/[^"']+)["']/gi)
      .map((url) => absolutizeUrl(url, "https://www.kupi.cz") ?? url),
  );
  const preferredUrl = pickBestKupiLeafletUrl(chainCode, detailUrls);
  const candidateUrls = preferredUrl
    ? [preferredUrl, ...detailUrls.filter((url) => url !== preferredUrl)]
    : detailUrls;

  for (const detailUrl of candidateUrls.slice(0, 4)) {
    try {
      const detailHtml = await fetchHtml(detailUrl);
      const pageImages = extractKupiPageImages(detailHtml);
      if (pageImages.length === 0) {
        continue;
      }

      const leafletId = detailUrl.split("/").pop() ?? `${chainCode}:kupi`;
      const leafletTitle = extractOgTitle(detailHtml) ?? t("ru", "leaflet_default", { chain: chainName });
      const { validFrom, validTo } = parseLooseCzDateRange(detailHtml);

      return pageImages.map(({ imageUrl }, index, allPages) => ({
        chainCode,
        chainName,
        leafletId,
        leafletTitle,
        imageUrl,
        sourceUrl: detailUrl,
        pageIndex: index,
        pageCount: allPages.length,
        validFrom,
        validTo,
      }));
    } catch (error) {
      console.error("kupi leaflet resolve failed", { chainCode, detailUrl, error });
    }
  }

  return [];
}

function extractSchwarzFlyerIdentifier(viewerUrl: string) {
  try {
    const url = new URL(viewerUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    const arIndex = segments.findIndex((segment) => segment === "ar");
    const relevantSegments = arIndex >= 0 ? segments.slice(0, arIndex) : segments;
    return relevantSegments[relevantSegments.length - 1] ?? null;
  } catch {
    return null;
  }
}

function extractSchwarzRegionId(viewerUrl: string) {
  try {
    const url = new URL(viewerUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    const arIndex = segments.findIndex((segment) => segment === "ar");
    const value = arIndex >= 0 ? segments[arIndex + 1] : null;
    return value && /^\d+$/u.test(value) ? Number(value) : null;
  } catch {
    return null;
  }
}

async function fetchSchwarzFlyer(viewerUrl: string) {
  const flyerIdentifier = extractSchwarzFlyerIdentifier(viewerUrl);
  if (!flyerIdentifier) {
    return null;
  }

  const params = new URLSearchParams({
    flyer_identifier: flyerIdentifier,
  });
  const regionId = extractSchwarzRegionId(viewerUrl);
  if (regionId !== null) {
    params.set("region_id", String(regionId));
    params.set("region_code", String(regionId));
  }

  const response = await fetch(`${SCHWARZ_API_URL}?${params.toString()}`, {
    headers: {
      ...BROWSER_HEADERS,
      Accept: "application/json,text/plain,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Schwarz flyer fetch failed: ${response.status} ${viewerUrl}`);
  }

  const payload = await response.json();
  if (!payload?.success || !payload?.flyer) {
    return null;
  }

  return payload.flyer;
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: BROWSER_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`Leaflet fetch failed: ${response.status} ${url}`);
  }

  return await response.text();
}

async function resolveIndexedViewerPages(
  chainCode: string,
  chainName: string,
  offer: IngestedOffer,
  baseUrl: string,
  maxPages = 16,
): Promise<LeafletPage[]> {
  const pages: LeafletPage[] = [];
  const seenImages = new Set<string>();
  let misses = 0;

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    try {
      const pageUrl = normalizePageUrl(baseUrl, pageIndex);
      const html = await fetchHtml(pageUrl);
      const imageUrl = extractLeafletImage(html);

      if (!imageUrl || seenImages.has(imageUrl)) {
        misses += 1;
        if (pageIndex > 0 || misses >= 2) {
          break;
        }
        continue;
      }

      seenImages.add(imageUrl);
      pages.push({
        chainCode,
        chainName,
        leafletId: offer.externalOfferId,
        leafletTitle: offer.title,
        imageUrl,
        sourceUrl: pageUrl,
        pageIndex,
        pageCount: 0,
        validFrom: offer.validFrom,
        validTo: offer.validTo,
      });
      misses = 0;
    } catch {
      misses += 1;
      if (pageIndex > 0 || misses >= 2) {
        break;
      }
    }
  }

  return pages.map((page) => ({ ...page, pageCount: pages.length }));
}

async function resolvePublitasViewerPages(
  chainCode: string,
  chainName: string,
  offer: IngestedOffer,
  viewerUrl: string,
  maxPages = 24,
): Promise<LeafletPage[]> {
  const firstPageUrl = normalizePublitasPageUrl(viewerUrl, 1);
  const firstHtml = await fetchHtml(firstPageUrl);
  const pageCount = Math.min(extractPublitasPageCount(firstHtml) ?? 1, maxPages);
  const title = extractPublitasTitle(firstHtml) ?? offer.title;
  const pages: LeafletPage[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const pageUrl = normalizePublitasPageUrl(viewerUrl, pageNumber);
    const html = pageNumber === 1 ? firstHtml : await fetchHtml(pageUrl);
    const imageUrl = extractPublitasPageImage(html, pageUrl);
    if (!imageUrl) {
      continue;
    }

    pages.push({
      chainCode,
      chainName,
      leafletId: offer.externalOfferId,
      leafletTitle: title,
      imageUrl,
      sourceUrl: pageUrl,
      pageIndex: pageNumber - 1,
      pageCount,
      validFrom: offer.validFrom,
      validTo: offer.validTo,
    });
  }

  return pages;
}

async function resolveSchwarzViewerPages(
  chainCode: string,
  chainName: string,
  offer: IngestedOffer,
  viewerUrl: string,
): Promise<LeafletPage[]> {
  const flyer = await fetchSchwarzFlyer(viewerUrl);
  const flyerPages = Array.isArray(flyer?.pages) ? flyer.pages : [];
  if (flyerPages.length === 0) {
    return [];
  }

  const leafletTitle = flyer.title ?? flyer.name ?? offer.title;
  const validFrom = flyer.offerStartDate ?? offer.validFrom;
  const validTo = flyer.offerEndDate ?? offer.validTo;

  return flyerPages
    .filter((page: Record<string, unknown>) => typeof page?.image === "string" || typeof page?.zoom === "string")
    .map((page: Record<string, unknown>, index: number): LeafletPage => ({
      chainCode,
      chainName,
      leafletId: String(flyer.id ?? offer.externalOfferId),
      leafletTitle,
      imageUrl: String(page.zoom ?? page.image),
      sourceUrl: viewerUrl,
      pageIndex: Math.max(0, Number(page.number ?? index + 1) - 1),
      pageCount: flyerPages.length,
      validFrom,
      validTo,
    }))
    .sort((left: LeafletPage, right: LeafletPage) => left.pageIndex - right.pageIndex);
}

async function resolveSingleLeafletPage(
  chainCode: string,
  chainName: string,
  offer: IngestedOffer,
): Promise<LeafletPage[]> {
  const sourceUrl = typeof offer.rawPayload?.viewUrl === "string" ? offer.rawPayload.viewUrl : offer.sourceUrl;
  const imageUrl = absolutizeUrl(
    offer.imageUrl
    ?? (typeof offer.rawPayload?.imageUrl === "string" ? offer.rawPayload.imageUrl : null)
    ?? (typeof offer.rawPayload?.viewUrl === "string"
      ? await fetchHtml(offer.rawPayload.viewUrl).then(extractOgImage).catch(() => null)
      : null)
    ?? (!offer.sourceUrl.toLowerCase().endsWith(".pdf")
      ? await fetchHtml(offer.sourceUrl).then(extractOgImage).catch(() => null)
      : null),
    sourceUrl,
  );

  if (!imageUrl) {
    return [];
  }

  return [{
    chainCode,
    chainName,
    leafletId: offer.externalOfferId,
    leafletTitle: offer.title,
    imageUrl,
    sourceUrl,
    pageIndex: 0,
    pageCount: 1,
    validFrom: offer.validFrom,
    validTo: offer.validTo,
  }];
}

async function buildSyntheticLeafletPages(
  chainCode: string,
  chainName: string,
): Promise<LeafletPage[]> {
  if (chainCode !== "kaufland") {
    const kupiPages = await resolveKupiLeafletPages(chainCode, chainName).catch((error) => {
      console.error("synthetic kupi leaflets failed", { chainCode, error });
      return [];
    });

    if (kupiPages.length > 0) {
      return kupiPages;
    }
  }

  if (chainCode === "kaufland") {
    const sourceUrl = "https://prodejny.kaufland.cz/letak.html";
    const html = await fetchHtml(sourceUrl);
    const viewerUrls = uniqueUrls(
      extractHrefMatches(html, /href=["'](https:\/\/leaflets\.kaufland\.com\/[^"']+)["']/gi),
    );

    for (const viewerUrl of viewerUrls) {
      const syntheticOffer = {
        externalOfferId: `${chainCode}:${extractSchwarzFlyerIdentifier(viewerUrl) ?? "current"}`,
        title: extractOgTitle(html) ?? t("ru", "leaflet_default", { chain: chainName }),
        brand: chainName,
        category: "Leaflet",
        categoryKey: null,
        priceCurrent: null,
        priceOriginal: null,
        discountPercent: null,
        unitPrice: null,
        imageUrl: null,
        sourceUrl: viewerUrl,
        sourceType: "kaufland_leaflet_schwarz",
        validFrom: null,
        validTo: null,
        scope: "national" as const,
        rawPayload: {
          viewUrl: viewerUrl,
        },
      } satisfies IngestedOffer;

      const pages = await resolveSchwarzViewerPages(chainCode, chainName, syntheticOffer, viewerUrl);
      if (pages.length > 0) {
        return pages;
      }
    }

    const imageUrl = extractLeafletImage(html);
    if (!imageUrl) {
      return [];
    }

    const { validFrom, validTo } = parseLooseCzDateRange(html);
    const title = extractOgTitle(html) ?? t("ru", "leaflet_default", { chain: chainName });

    return [{
      chainCode,
      chainName,
      leafletId: `${chainCode}:current`,
      leafletTitle: title,
      imageUrl,
      sourceUrl,
      pageIndex: 0,
      pageCount: 1,
      validFrom,
      validTo,
    }];
  }

  if (chainCode === "lidl") {
    const sourceUrl = "https://www.lidl.cz/c/akcni-letak/s10008644";
    const html = await fetchHtml(sourceUrl);
    const viewerUrls = uniqueUrls(
      extractHrefMatches(html, /href=["'](https:\/\/www\.lidl\.cz\/l\/cs\/letak\/[^"']+)["']/gi),
    );

    for (const viewerUrl of viewerUrls) {
      const syntheticOffer = {
        externalOfferId: `${chainCode}:${extractSchwarzFlyerIdentifier(viewerUrl) ?? "current"}`,
        title: extractOgTitle(html) ?? t("ru", "leaflet_default", { chain: chainName }),
        brand: chainName,
        category: "Leaflet",
        categoryKey: null,
        priceCurrent: null,
        priceOriginal: null,
        discountPercent: null,
        unitPrice: null,
        imageUrl: null,
        sourceUrl: viewerUrl,
        sourceType: "lidl_leaflet_schwarz",
        validFrom: null,
        validTo: null,
        scope: "national" as const,
        rawPayload: {
          viewUrl: viewerUrl,
        },
      } satisfies IngestedOffer;

      const pages = await resolveSchwarzViewerPages(chainCode, chainName, syntheticOffer, viewerUrl);
      if (pages.length > 0) {
        return pages;
      }
    }

    return [];
  }

  if (chainCode === "albert") {
    const sourceUrl = "https://www.albert.cz/aktualni-letaky";
    const html = await fetchHtml(sourceUrl);
    const pattern =
      /"id":"(\d+)","isDefault":(?:true|false),"validityStartDateFormatted":"(\d{2}\.\d{2}\.\d{4})","validityEndDateFormatted":"(\d{2}\.\d{2}\.\d{4})".*?"title":"([^"]+)","locationType":"([^"]+)","viewUrl":"([^"]+)","imageUrl":"([^"]+)","downloadUrl":"([^"]+)"/g;

    for (const match of html.matchAll(pattern)) {
      const viewUrl = match[6].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
      const syntheticOffer = {
        externalOfferId: `albert:${match[1]}`,
        title: match[4].replace(/_/g, " ").replace(/\\u0026/g, "&").replace(/\\\//g, "/"),
        brand: chainName,
        category: "Leaflet",
        categoryKey: null,
        priceCurrent: null,
        priceOriginal: null,
        discountPercent: null,
        unitPrice: null,
        imageUrl: match[7].replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/&amp;/g, "&"),
        sourceUrl: match[8].replace(/\\u0026/g, "&").replace(/\\\//g, "/") || viewUrl || sourceUrl,
        sourceType: "albert_leaflet_synthetic",
        validFrom: `${match[2].slice(6, 10)}-${match[2].slice(3, 5)}-${match[2].slice(0, 2)}`,
        validTo: `${match[3].slice(6, 10)}-${match[3].slice(3, 5)}-${match[3].slice(0, 2)}`,
        scope: "national" as const,
        rawPayload: {
          viewUrl,
        },
      } satisfies IngestedOffer;

      const pages = await resolvePublitasViewerPages(chainCode, chainName, syntheticOffer, viewUrl);
      if (pages.length > 0) {
        return pages;
      }
    }

    return [];
  }

  if (chainCode === "billa") {
    const sourceUrl = "https://www.billa.cz/letaky-billa";
    const html = await fetchHtml(sourceUrl);
    const pattern =
      /href="(https:\/\/view\.publitas\.com\/[^"]+\.pdf[^"]*)"[\s\S]{0,4000}?<iframe[^>]+src="([^"]+)"[^>]+title="([^"]+)"/g;

    for (const match of html.matchAll(pattern)) {
      const pdfUrl = match[1];
      const viewUrl = match[2];
      const rawTitle = match[3];
      const syntheticOffer = {
        externalOfferId: `billa:${rawTitle.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}`,
        title: rawTitle,
        brand: chainName,
        category: "Leaflet",
        categoryKey: null,
        priceCurrent: null,
        priceOriginal: null,
        discountPercent: null,
        unitPrice: null,
        imageUrl: null,
        sourceUrl: pdfUrl || viewUrl || sourceUrl,
        sourceType: "billa_leaflet_synthetic",
        validFrom: null,
        validTo: null,
        scope: "national" as const,
        rawPayload: {
          viewUrl,
        },
      } satisfies IngestedOffer;

      const pages = await resolvePublitasViewerPages(chainCode, chainName, syntheticOffer, viewUrl);
      if (pages.length > 0) {
        return pages;
      }
    }

    return [];
  }

  if (chainCode === "penny") {
    const sourceCandidates = [
      "https://www.kupi.cz/letaky/penny-market",
      "https://www.kupi.cz/letaky/penny",
    ];
    const pages: LeafletPage[] = [];
    const seenImages = new Set<string>();

    for (const sourceUrl of sourceCandidates) {
      try {
        const html = await fetchHtml(sourceUrl);
        const imageUrl = extractLeafletImage(html);
        if (!imageUrl || seenImages.has(imageUrl)) {
          continue;
        }
        seenImages.add(imageUrl);

        const { validFrom, validTo } = parseLooseCzDateRange(html);
        const title = extractOgTitle(html) ?? `${chainName} leták`;
        pages.push({
          chainCode,
          chainName,
          leafletId: `${chainCode}:${pages.length}`,
          leafletTitle: title,
          imageUrl,
          sourceUrl,
          pageIndex: 0,
          pageCount: 1,
          validFrom,
          validTo,
        });
      } catch {
        continue;
      }
    }

    return pages.map((page, index, allPages) => ({
      ...page,
      pageIndex: index,
      pageCount: allPages.length,
    }));
  }

  return [];
}

async function resolveLeafletPages(
  chainCode: string,
  chainName: string,
  offer: IngestedOffer,
): Promise<LeafletPage[]> {
  const viewerUrl = typeof offer.rawPayload?.viewUrl === "string"
    ? offer.rawPayload.viewUrl
    : offer.sourceUrl;

  if (isSchwarzViewerUrl(viewerUrl)) {
    const pages = await resolveSchwarzViewerPages(chainCode, chainName, offer, viewerUrl);
    if (pages.length > 0) {
      return pages;
    }
  }

  if (viewerUrl.includes("/ar/")) {
    const pages = await resolveIndexedViewerPages(chainCode, chainName, offer, viewerUrl);
    if (pages.length > 0) {
      return pages;
    }
  }

  if (viewerUrl.includes("publitas.com") || viewerUrl.includes("letaky.albert.cz")) {
    const pages = await resolvePublitasViewerPages(chainCode, chainName, offer, viewerUrl);
    if (pages.length > 0) {
      return pages;
    }
  }

  return await resolveSingleLeafletPage(chainCode, chainName, offer);
}

export async function buildStoreLeafletPages(
  chainCode: string,
  chainName: string,
) {
  const cacheKey = `${chainCode}:leaflets`;
  const cached = leafletPagesCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.pages;
  }

  if (PRIMARY_SYNTHETIC_LEAFLET_CHAINS.has(chainCode)) {
    const syntheticPages = await buildSyntheticLeafletPages(chainCode, chainName);
    if (syntheticPages.length > 0) {
      leafletPagesCache.set(cacheKey, {
        pages: syntheticPages,
        expiresAt: Date.now() + LEAFLET_CACHE_TTL_MS,
      });
      return syntheticPages;
    }
  }

  let offers = await fetchOffersForChain(chainCode, 16, { preferStored: false, allowLive: true });
  if (offers.length === 0) {
    offers = await fetchOffersForChain(chainCode, 16, { preferStored: true, allowLive: true });
  }
  const leafletOffers = offers.filter(isLeafletOffer).slice(0, 4);
  const pages: LeafletPage[] = [];

  for (const offer of leafletOffers) {
    try {
      const resolved = await resolveLeafletPages(chainCode, chainName, offer);
      pages.push(...resolved);
    } catch (error) {
      console.error("leaflet offer resolve failed", {
        chainCode,
        sourceUrl: offer.sourceUrl,
        offerId: offer.externalOfferId,
        error,
      });
    }
  }

  if (pages.length === 0) {
    const syntheticPages = await buildSyntheticLeafletPages(chainCode, chainName);
    if (syntheticPages.length > 0) {
      leafletPagesCache.set(cacheKey, {
        pages: syntheticPages,
        expiresAt: Date.now() + LEAFLET_CACHE_TTL_MS,
      });
      return syntheticPages;
    }
  }

  leafletPagesCache.set(cacheKey, {
    pages,
    expiresAt: Date.now() + LEAFLET_CACHE_TTL_MS,
  });

  return pages;
}

export function formatLeafletCaption(
  language: SupportedLanguage,
  page: LeafletPage,
  globalIndex: number,
  globalTotal: number,
) {
  const range = formatDateRange(page.validFrom, page.validTo);
  const issueLabel = leafletIssueLabel(language, globalIndex + 1, globalTotal);
  const pageLabel = leafletPageLabel(language, page.pageIndex + 1, page.pageCount);

  const lines = [
    `<b>${escapeHtml(page.chainName)}</b>`,
    `<blockquote>${escapeHtml(issueLabel)}</blockquote>`,
    "",
    `<i>${escapeHtml(pageLabel)}</i>`,
  ];

  if (range) {
    lines.push(`📅 ${escapeHtml(range)}`);
  }

  if (range) {
    lines.push(`📅 ${escapeHtml(leafletDateLabel(language, range))}`);
  }

  return lines.join("\n");
}

export function clearLeafletCache(chainCode?: string) {
  if (!chainCode) {
    leafletPagesCache.clear();
    return;
  }

  leafletPagesCache.delete(`${chainCode}:leaflets`);
}
