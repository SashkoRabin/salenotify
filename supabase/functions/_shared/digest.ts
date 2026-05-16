import type { IngestedOffer } from "./adapters/common.ts";
import {
  getCategoryFromSourceCode,
  getCategoryKeyFromText,
  getCategoryLabel,
  scoreCategoryMatch,
  type ProductCategoryKey,
} from "./categories.ts";
import { SUPPORTED_CHAINS } from "./catalog.ts";
import { previewDigestMessage } from "./copy.ts";
import type { DigestOffer } from "./digest-types.ts";
import {
  buildDisplayTitle,
  dedupeDigestOffers,
  dedupeLocalizedOffers,
  effectiveDiscountPercent,
  formatPragueHour,
  normalizeAsciiFold,
  sortChainOffers,
  sortOffersByDiscountDescending,
} from "./digest-model.ts";
import {
  digestHeader,
  formatMetaLine,
  formatStoreCarouselProductCaption,
} from "./digest-render.ts";
import { fetchOffersForChain, ingestChainOffers } from "./offers.ts";
import { t, type SupportedLanguage } from "./i18n.ts";
import { escapeHtml } from "./telegram.ts";
import { translateBatch } from "./translator.ts";

export type { DigestOffer };

const VISIBLE_PER_CHAIN = 7;
export const STORE_CAROUSEL_OFFER_LIMIT = 20;
const MAX_PREFERRED_PER_CATEGORY = 3;

async function resolveTranslations(offers: DigestOffer[], language: SupportedLanguage) {
  return await translateBatch(
    offers.map((offer) => offer.title),
    language,
    () => null,
  );
}

export function shouldRunDailyDigest(now = new Date()) {
  return formatPragueHour(now) === "09:00";
}

export async function refreshDigestSources(chainCodes: string[]) {
  await Promise.allSettled(chainCodes.map(async (chain) => {
    try {
      await ingestChainOffers(chain);
    } catch (error) {
      console.error(`${chain} ingest failed inside digest refresh`, error);
    }
  }));
}

export function getChainDisplayName(chainCode: string) {
  return SUPPORTED_CHAINS.find((chain) => chain.code === chainCode)?.name ?? chainCode;
}

export function parseChainInput(input: string) {
  const normalized = input.trim().toLowerCase();
  return SUPPORTED_CHAINS.find((chain) =>
    chain.code === normalized ||
    chain.name.toLowerCase() === normalized ||
    chain.aliases.some((alias) => alias.toLowerCase() === normalized)
  ) ?? null;
}

function resolveOfferCategoryKey(offer: DigestOffer): ProductCategoryKey | null {
  return offer.categoryKey
    ?? getCategoryFromSourceCode(
      offer.rawPayload?.categoryCode as string | undefined,
      offer.chainCode,
    )
    ?? getCategoryKeyFromText(`${offer.title} ${offer.category ?? ""}`);
}

function pickVisibleDigestOffers(
  offers: DigestOffer[],
  preferredCategoryKeys: ProductCategoryKey[],
  limit: number,
) {
  if (offers.length <= limit || preferredCategoryKeys.length === 0) {
    return offers.slice(0, limit);
  }

  const preferredSet = new Set(preferredCategoryKeys);
  const counts = new Map<ProductCategoryKey, number>();
  const selected = new Set<string>();
  const result: DigestOffer[] = [];

  for (const offer of offers) {
    if (result.length >= limit) break;

    const categoryKey = resolveOfferCategoryKey(offer);
    if (!categoryKey || !preferredSet.has(categoryKey)) {
      continue;
    }

    const count = counts.get(categoryKey) ?? 0;
    if (count >= MAX_PREFERRED_PER_CATEGORY) {
      continue;
    }

    result.push(offer);
    selected.add(offer.externalOfferId);
    counts.set(categoryKey, count + 1);
  }

  if (result.length >= limit) {
    return result.slice(0, limit);
  }

  for (const offer of offers) {
    if (result.length >= limit) break;
    if (selected.has(offer.externalOfferId)) {
      continue;
    }
    result.push(offer);
  }

  return result.slice(0, limit);
}

async function collectDigestOffers(chainCode: string, limit: number) {
  const chainName = getChainDisplayName(chainCode);
  const offers = dedupeDigestOffers(await fetchOffersForChain(
    chainCode,
    Math.max(limit, chainCode === "kaufland" ? 120 : 24),
    { preferStored: true, allowLive: true },
  ));

  return offers.map((offer) => ({
    chainCode,
    chainName,
    externalOfferId: offer.externalOfferId,
    title: offer.title,
    category: offer.category,
    categoryKey: offer.categoryKey ?? null,
    priceCurrent: offer.priceCurrent,
    priceOriginal: offer.priceOriginal,
    discountPercent: offer.discountPercent,
    validFrom: offer.validFrom,
    validTo: offer.validTo,
    sourceUrl: offer.sourceUrl,
    unitPrice: offer.unitPrice,
    rawPayload: offer.rawPayload,
  }));
}

export async function buildStoreDetail(params: {
  chainCode: string;
  language: SupportedLanguage;
  now?: Date;
  limit?: number;
}) {
  const now = params.now ?? new Date();
  const limit = params.limit ?? STORE_CAROUSEL_OFFER_LIMIT;
  const sourceOffers = await fetchOffersForChain(
    params.chainCode,
    Math.max(limit, params.chainCode === "kaufland" ? 120 : 24),
    { preferStored: true, allowLive: true },
  );

  const offers = sortOffersByDiscountDescending(dedupeDigestOffers(sourceOffers.map((offer) => ({
    chainCode: params.chainCode,
    chainName: getChainDisplayName(params.chainCode),
    externalOfferId: offer.externalOfferId,
    title: offer.title,
    category: offer.category,
    categoryKey: offer.categoryKey ?? null,
    priceCurrent: offer.priceCurrent,
    priceOriginal: offer.priceOriginal,
    discountPercent: offer.discountPercent,
    unitPrice: offer.unitPrice ?? null,
    validFrom: offer.validFrom,
    validTo: offer.validTo,
    sourceUrl: offer.sourceUrl,
    rawPayload: offer.rawPayload ?? null,
  }))));

  const selectedOrder = offers.slice(0, limit).map((offer) => offer.externalOfferId);
  const detailedMap = new Map(sourceOffers.map((offer) => [offer.externalOfferId, offer]));
  const detailedOffers = selectedOrder
    .map((id) => detailedMap.get(id))
    .filter((offer): offer is IngestedOffer => Boolean(offer));

  const translatedTitles = await translateBatch(
    detailedOffers.map((offer) => offer.title),
    params.language,
    () => null,
  );

  return detailedOffers.map((offer) => {
    const translated = translatedTitles.get(offer.title) ?? offer.title;
    const displayTitle = buildDisplayTitle(
      {
        chainCode: params.chainCode,
        chainName: getChainDisplayName(params.chainCode),
        externalOfferId: offer.externalOfferId,
        title: offer.title,
        category: offer.category,
        categoryKey: offer.categoryKey ?? null,
        priceCurrent: offer.priceCurrent,
        priceOriginal: offer.priceOriginal,
        discountPercent: offer.discountPercent,
        unitPrice: offer.unitPrice ?? null,
        validFrom: offer.validFrom,
        validTo: offer.validTo,
        sourceUrl: offer.sourceUrl,
        rawPayload: offer.rawPayload ?? null,
      },
      translated,
    );
    const showOriginal = params.language !== "cs" && normalizeAsciiFold(translated) !== normalizeAsciiFold(offer.title);
    const digestOffer: DigestOffer = {
      chainCode: params.chainCode,
      chainName: getChainDisplayName(params.chainCode),
      externalOfferId: offer.externalOfferId,
      title: offer.title,
      category: offer.category,
      categoryKey: offer.categoryKey ?? null,
      priceCurrent: offer.priceCurrent,
      priceOriginal: offer.priceOriginal,
      discountPercent: offer.discountPercent,
      unitPrice: offer.unitPrice ?? null,
      validFrom: offer.validFrom,
      validTo: offer.validTo,
      sourceUrl: offer.sourceUrl,
      rawPayload: offer.rawPayload ?? null,
    };
    const caption = formatStoreCarouselProductCaption(
      params.language,
      digestOffer,
      displayTitle,
      showOriginal,
      offer.title,
      now,
    );

    return {
      ...offer,
      translatedTitle: translated,
      caption,
    };
  }).slice(0, limit);
}

export async function buildCategoryComparison(params: {
  categoryKey: ProductCategoryKey;
  selectedCodes: string[];
  selectedChains: string[];
  language: SupportedLanguage;
  cityName: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const digestCodes = params.selectedCodes.length > 0
    ? params.selectedCodes
    : SUPPORTED_CHAINS.map((chain) => chain.code);

  const allOffers = (await Promise.all(
    digestCodes.map((code) => collectDigestOffers(code, code === "kaufland" ? 120 : 24)),
  )).flat();

  const filtered = dedupeLocalizedOffers(
    allOffers
      .map((offer) => {
        const sourceCategory = getCategoryFromSourceCode(
          offer.rawPayload?.categoryCode as string | undefined,
          offer.chainCode,
        );
        const categoryScore = sourceCategory === params.categoryKey
          ? 1000
          : scoreCategoryMatch(offer.title, params.categoryKey);
        return { offer, categoryScore };
      })
      .filter((item) => item.categoryScore > 0)
      .sort((left, right) =>
        right.categoryScore - left.categoryScore ||
        effectiveDiscountPercent(right.offer) - effectiveDiscountPercent(left.offer) ||
        (left.offer.priceCurrent ?? Number.MAX_SAFE_INTEGER) - (right.offer.priceCurrent ?? Number.MAX_SAFE_INTEGER),
      )
      .slice(0, 20)
      .map((item) => item.offer),
    new Map(),
  );

  if (filtered.length === 0) {
    return [
      `🔎 <b>${escapeHtml(getCategoryLabel(params.language, params.categoryKey))}</b>`,
      "",
      "<i>Подходящих предложений сейчас не вижу.</i>",
    ].join("\n");
  }

  const translations = await resolveTranslations(filtered, params.language);
  const lines = [
    `🔎 <b>${escapeHtml(getCategoryLabel(params.language, params.categoryKey))}</b>`,
    `📍 ${escapeHtml(params.cityName)}`,
    "",
  ];

  filtered.forEach((offer, index) => {
    const translated = translations.get(offer.title) ?? offer.title;
    lines.push(`${index + 1}. <b>${escapeHtml(offer.chainName)}</b> — ${escapeHtml(translated)}`);
    lines.push(`   ${formatMetaLine(params.language, offer, now)}`);
    lines.push("");
  });

  return lines.join("\n").trim();
}

function buildChainSection(
  code: string,
  chainOffers: DigestOffer[],
  preferredCategoryKeys: ProductCategoryKey[],
  translations: Map<string, string>,
  language: SupportedLanguage,
  now: Date,
): string[] {
  const sections: string[] = [];

  sections.push(`🛒 <b>${escapeHtml(getChainDisplayName(code))}</b>`);
  sections.push("");

  const visibleOffers = pickVisibleDigestOffers(chainOffers, preferredCategoryKeys, VISIBLE_PER_CHAIN);
  for (let i = 0; i < visibleOffers.length; i++) {
    const offer = visibleOffers[i]!;
    const translated = translations.get(offer.title) ?? offer.title;
    sections.push(`• <b>${escapeHtml(translated)}</b>`);
    sections.push(`${formatMetaLine(language, offer, now)}`);
    if (i < visibleOffers.length - 1) {
      sections.push("");
    }
  }

  sections.push("");
  return sections;
}

export async function buildDigestMessage(params: {
  cityName: string;
  selectedCodes: string[];
  selectedChains: string[];
  language: SupportedLanguage;
  preferredCategoryKeys?: ProductCategoryKey[];
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const preferredCategoryKeys = params.preferredCategoryKeys ?? [];
  const preferredCategorySet = new Set(preferredCategoryKeys);
  const digestCodes = params.selectedCodes.length > 0
    ? params.selectedCodes
    : SUPPORTED_CHAINS.map((chain) => chain.code);

  const byChain = new Map(
    (await Promise.all(
      digestCodes.map(async (code) => [
        code,
        sortChainOffers(
          await collectDigestOffers(code, code === "kaufland" ? 120 : 24),
          preferredCategorySet,
        ),
      ] as const),
    )),
  );

  const allOffers = Array.from(byChain.values()).flat();
  const translations = await resolveTranslations(allOffers, params.language);
  const chainLabels = params.selectedChains.length > 0
    ? params.selectedChains
    : digestCodes.map((code) => getChainDisplayName(code));

  const sections: string[] = [];

  for (const code of digestCodes) {
    const chainOffers = dedupeLocalizedOffers(byChain.get(code) ?? [], translations);
    if (chainOffers.length === 0) {
      continue;
    }

    sections.push(...buildChainSection(code, chainOffers, preferredCategoryKeys, translations, params.language, now));
  }

  if (sections.length === 0) {
    return previewDigestMessage(
      params.language,
      params.cityName,
      params.selectedChains.length > 0 ? params.selectedChains : SUPPORTED_CHAINS.map((chain) => chain.name),
    );
  }

  return [
    digestHeader(params.cityName, now),
    `🧭 ${chainLabels.map((c) => escapeHtml(c)).join(" · ")}`,
    "",
    ...sections,
  ].join("\n").trim();
}
