import type { ProductCategoryKey } from "./categories.ts";

/**
 * Normalized offer shape used when building digest text, category views, and store detail.
 * Mirrors {@link IngestedOffer} fields needed for sorting, dedupe, and Telegram HTML output.
 */
export type DigestOffer = {
  chainCode: string;
  chainName: string;
  externalOfferId: string;
  title: string;
  category: string | null;
  categoryKey: ProductCategoryKey | null;
  priceCurrent: number | null;
  priceOriginal: number | null;
  discountPercent: number | null;
  unitPrice: string | null;
  validFrom: string | null;
  validTo: string | null;
  sourceUrl: string;
  rawPayload: Record<string, unknown> | null;
};
