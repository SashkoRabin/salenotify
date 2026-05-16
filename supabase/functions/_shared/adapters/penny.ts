import { fetchKupiChainOffers } from "./kupi.ts";
import { type IngestedOffer } from "./common.ts";

export async function fetchPennyOffers(limit = 10): Promise<IngestedOffer[]> {
  return await fetchKupiChainOffers("penny", limit);
}
