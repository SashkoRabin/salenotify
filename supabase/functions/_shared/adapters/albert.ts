import { decodeHtml, parseCzDateRange, slugify, type IngestedOffer } from "./common.ts";
import { fetchKupiChainOffers } from "./kupi.ts";

const ALBERT_LEAFLETS_URL = "https://www.albert.cz/aktualni-letaky";

function humanizeAlbertLeaflet(locationType: string, rawTitle: string) {
  const normalizedType = locationType.toLowerCase();

  if (normalizedType.includes("hyper")) {
    return "Летак Albert";
  }

  if (normalizedType.includes("super")) {
    return "Летак Albert";
  }

  if (/hm/i.test(rawTitle)) {
    return "Летак Albert";
  }

  if (/\bsm\b/i.test(rawTitle)) {
    return "Летак Albert";
  }

  return "Летак Albert";
}

export async function fetchAlbertOffers(limit = 4): Promise<IngestedOffer[]> {
  try {
    const kupiOffers = await fetchKupiChainOffers("albert", Math.max(limit, 10));

    if (kupiOffers.length > 0) {
      return kupiOffers.slice(0, limit);
    }
  } catch (error) {
    console.error("Albert kupi adapter failed, falling back to leaflets", error);
  }

  const response = await fetch(ALBERT_LEAFLETS_URL);

  if (!response.ok) {
    throw new Error(`Albert leaflets fetch failed: ${response.status}`);
  }

  const html = await response.text();
  const pattern =
    /"id":"(\d+)","isDefault":(?:true|false),"validityStartDateFormatted":"(\d{2}\.\d{2}\.\d{4})","validityEndDateFormatted":"(\d{2}\.\d{2}\.\d{4})".*?"title":"([^"]+)","locationType":"([^"]+)","viewUrl":"([^"]+)","imageUrl":"([^"]+)","downloadUrl":"([^"]+)"/g;
  const seen = new Set<string>();
  const offers: IngestedOffer[] = [];

  for (const match of html.matchAll(pattern)) {
    const id = match[1];

    if (seen.has(id)) {
      continue;
    }

    seen.add(id);

    const { validFrom, validTo } = parseCzDateRange(`od ${match[2]} do ${match[3]}`);
    const rawTitle = decodeHtml(match[4].replace(/_/g, " "));
    const locationType = decodeHtml(match[5]);
    const viewUrl = decodeHtml(match[6]);
    const imageUrl = decodeHtml(match[7]);
    const downloadUrl = decodeHtml(match[8]);
    const title = humanizeAlbertLeaflet(locationType, rawTitle);

    offers.push({
      externalOfferId: `albert:${id}`,
      title,
      brand: "Albert",
      category: `Leaflet ${locationType}`,
      categoryKey: null,
      priceCurrent: null,
      priceOriginal: null,
      discountPercent: null,
      unitPrice: null,
      imageUrl,
      sourceUrl: downloadUrl || viewUrl || ALBERT_LEAFLETS_URL,
      sourceType: "albert_leaflet",
      validFrom,
      validTo,
      scope: "national",
      rawPayload: {
        id,
        rawTitle,
        locationType,
        viewUrl,
        imageUrl,
        pageUrl: ALBERT_LEAFLETS_URL,
      },
    });
  }

  if (offers.length > 0) {
    return offers.slice(0, limit);
  }

  const fallbackPattern =
    /<h2[^>]*>([^<]+let[aá]k)[\s\S]*?<div src="([^"]+cover_page\.jpg[^"]*)"[\s\S]*?<p[^>]*>Od (\d{2}\.\d{2}\.\d{4}) do (\d{2}\.\d{2}\.\d{4})<\/p>/giu;

  return Array.from(html.matchAll(fallbackPattern)).slice(0, limit).map((match) => {
    const rawTitle = decodeHtml(match[1]);
    const imageUrl = decodeHtml(match[2]).replace(/&amp;/g, "&");
    const { validFrom, validTo } = parseCzDateRange(`od ${match[3]} do ${match[4]}`);
    const title = humanizeAlbertLeaflet("fallback", rawTitle);

    return {
      externalOfferId: `albert:${slugify(`${title}-${match[3]}`)}`,
      title,
      brand: "Albert",
      category: "Leaflet",
      categoryKey: null,
      priceCurrent: null,
      priceOriginal: null,
      discountPercent: null,
      unitPrice: null,
      imageUrl,
      sourceUrl: ALBERT_LEAFLETS_URL,
      sourceType: "albert_leaflet",
      validFrom,
      validTo,
      scope: "national",
      rawPayload: {
        rawTitle,
        imageUrl,
        pageUrl: ALBERT_LEAFLETS_URL,
      },
    };
  });
}
