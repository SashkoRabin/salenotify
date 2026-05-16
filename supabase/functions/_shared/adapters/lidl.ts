import { type IngestedOffer } from "./common.ts";

function formatSlugDate(date: Date) {
  return `${date.getUTCDate()}-${date.getUTCMonth() + 1}-${date.getUTCFullYear()}`;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildCurrentLeaflets(today = startOfUtcDay(new Date())) {
  const day = today.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = addDays(today, diffToMonday);
  const thursday = addDays(monday, 3);
  const sunday = addDays(monday, 6);
  const mondayTo = addDays(monday, 2);
  const useThursdayFlyer = today >= thursday;
  const groceryFrom = useThursdayFlyer ? thursday : monday;
  const groceryTo = useThursdayFlyer ? sunday : mondayTo;
  const groceryWeekday = useThursdayFlyer ? "ctvrtka" : "pondeli";

  return [
    {
      externalOfferId: `lidl:grocery:${isoDate(groceryFrom)}`,
      title: useThursdayFlyer ? "Lidl akcni letak od ctvrtka" : "Lidl akcni letak od pondeli",
      brand: "Lidl",
      category: "Leaflet",
      categoryKey: null,
      priceCurrent: null,
      priceOriginal: null,
      discountPercent: null,
      unitPrice: null,
      imageUrl: null,
      sourceUrl:
        `https://www.lidl.cz/l/cs/letak/akcni-letak-od-${groceryWeekday}-${formatSlugDate(groceryFrom)}-${formatSlugDate(groceryTo)}/ar/0?lf=HHZ`,
      sourceType: "lidl_leaflet_generated",
      validFrom: isoDate(groceryFrom),
      validTo: isoDate(groceryTo),
      scope: "national" as const,
      rawPayload: {
        generated: true,
        type: "grocery",
      },
    },
    {
      externalOfferId: `lidl:spotrebni-zbozi:${isoDate(monday)}`,
      title: "Lidl spotrebni zbozi",
      brand: "Lidl",
      category: "Leaflet",
      categoryKey: null,
      priceCurrent: null,
      priceOriginal: null,
      discountPercent: null,
      unitPrice: null,
      imageUrl: null,
      sourceUrl:
        `https://www.lidl.cz/l/cs/letak/spotrebni-zbozi-${formatSlugDate(monday)}-${formatSlugDate(sunday)}/ar/0?lf=HHZ`,
      sourceType: "lidl_leaflet_generated",
      validFrom: isoDate(monday),
      validTo: isoDate(sunday),
      scope: "national" as const,
      rawPayload: {
        generated: true,
        type: "non_food",
      },
    },
  ];
}

export async function fetchLidlOffers(limit = 6): Promise<IngestedOffer[]> {
  return buildCurrentLeaflets().slice(0, limit);
}
