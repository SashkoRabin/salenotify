import { decodeHtml, parseCzDateRange, slugify, type IngestedOffer } from "./common.ts";
import { fetchKupiChainOffers } from "./kupi.ts";

const BILLA_LEAFLETS_URL = "https://www.billa.cz/letaky-billa";

function humanizeBillaLeaflet(rawTitle: string) {
  if (/velk/i.test(rawTitle)) {
    return "Большой летак BILLA";
  }

  if (/mal/i.test(rawTitle)) {
    return "Малый летак BILLA";
  }

  return "Летак BILLA";
}

export async function fetchBillaOffers(limit = 4): Promise<IngestedOffer[]> {
  try {
    const kupiOffers = await fetchKupiChainOffers("billa", Math.max(limit, 10));

    if (kupiOffers.length > 0) {
      return kupiOffers.slice(0, limit);
    }
  } catch (error) {
    console.error("BILLA kupi adapter failed, falling back to leaflets", error);
  }

  const response = await fetch(BILLA_LEAFLETS_URL);

  if (!response.ok) {
    throw new Error(`BILLA leaflets fetch failed: ${response.status}`);
  }

  const html = await response.text();
  const pattern =
    /href="(https:\/\/view\.publitas\.com\/[^"]+\.pdf[^"]*)"[\s\S]{0,4000}?<iframe[^>]+src="([^"]+)"[^>]+title="([^"]+)"/g;
  const seen = new Set<string>();
  const offers: IngestedOffer[] = [];

  for (const match of html.matchAll(pattern)) {
    const pdfUrl = decodeHtml(match[1]);
    const viewUrl = decodeHtml(match[2]);
    const rawTitle = decodeHtml(match[3]);
    const title = humanizeBillaLeaflet(rawTitle);
    const key = slugify(`${title}-${rawTitle}`);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    const { validFrom, validTo } = parseCzDateRange(rawTitle);

    offers.push({
      externalOfferId: `billa:${key}`,
      title,
      brand: "BILLA",
      category: "Leaflet",
      categoryKey: null,
      priceCurrent: null,
      priceOriginal: null,
      discountPercent: null,
      unitPrice: null,
      imageUrl: null,
      sourceUrl: pdfUrl || viewUrl || BILLA_LEAFLETS_URL,
      sourceType: "billa_leaflet",
      validFrom,
      validTo,
      scope: "national",
      rawPayload: {
        rawTitle,
        pdfUrl,
        viewUrl,
        pageUrl: BILLA_LEAFLETS_URL,
      },
    });
  }

  return offers.slice(0, limit);
}
