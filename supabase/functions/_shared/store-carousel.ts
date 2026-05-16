import {
  buildStoreDetail,
  getChainDisplayName,
  parseChainInput,
} from "./digest.ts";
import { queueDigestRefresh } from "./digest-actions.ts";
import { buildStoreLeafletPages, formatLeafletCaption } from "./leaflets.ts";
import {
  leafletCarouselKeyboard,
  mainMenuKeyboard,
  sendTelegramMessage,
  sendTelegramPhoto,
  editTelegramPhotoMessage,
  storeCarouselKeyboard,
  storeDetailKeyboard,
} from "./telegram.ts";
import { t, type SupportedLanguage } from "./i18n.ts";
import type { SubscriptionSnapshot } from "./user-state.ts";

async function resolveOfferImageUrl(offer: { imageUrl: string | null; rawPayload?: Record<string, unknown> }) {
  if (offer.imageUrl) {
    return offer.imageUrl;
  }

  const directImageUrl = typeof offer.rawPayload?.imageUrl === "string"
    ? offer.rawPayload.imageUrl
    : typeof offer.rawPayload?.image === "string"
      ? offer.rawPayload.image
      : null;

  if (directImageUrl) {
    return directImageUrl;
  }

  const productUrl = typeof offer.rawPayload?.productUrl === "string" ? offer.rawPayload.productUrl : null;
  if (!productUrl) {
    return null;
  }

  try {
    const response = await fetch(productUrl);
    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    return html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1]
      ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)?.[1]
      ?? null;
  } catch {
    return null;
  }
}

function storePlaceholderImage(chainName: string) {
  return `https://placehold.co/1200x900/f4f1ea/1f2937.png?text=${encodeURIComponent(chainName)}`;
}

function buildStoreCarouselCaption(
  chainName: string,
  total: number,
  index: number,
  offer: { caption: string },
) {
  return [
    `<b>${chainName}</b>`,
    `<i>${index + 1} / ${total}</i>`,
    "",
    offer.caption,
  ].join("\n");
}

export async function sendOrEditLeafletCarouselCard(params: {
  chatId: number;
  messageId?: number;
  chainCode: string;
  chainName: string;
  language: SupportedLanguage;
  index: number;
}) {
  const pages = await buildStoreLeafletPages(params.chainCode, params.chainName);

  if (pages.length === 0) {
    throw new Error(`No leaflet pages for ${params.chainCode}`);
  }

  const safeIndex = ((params.index % pages.length) + pages.length) % pages.length;
  const selectedPage = pages[safeIndex];
  const caption = formatLeafletCaption(params.language, selectedPage, safeIndex, pages.length);
  const keyboard = leafletCarouselKeyboard(params.language, params.chainCode, safeIndex, pages.length);

  if (params.messageId) {
    return await editTelegramPhotoMessage(params.chatId, params.messageId, selectedPage.imageUrl, caption, keyboard);
  }

  return await sendTelegramPhoto(params.chatId, selectedPage.imageUrl, caption, keyboard);
}

export async function sendOrEditStoreCarouselCard(params: {
  chatId: number;
  messageId?: number;
  chainCode: string;
  chainName: string;
  language: SupportedLanguage;
  index: number;
}) {
  const detailedOffers = await buildStoreDetail({
    chainCode: params.chainCode,
    language: params.language,
  });

  if (detailedOffers.length === 0) {
    throw new Error(`No detailed offers for ${params.chainCode}`);
  }

  const safeIndex = ((params.index % detailedOffers.length) + detailedOffers.length) % detailedOffers.length;
  const selectedOffer = detailedOffers[safeIndex];
  const imageUrl = await resolveOfferImageUrl(selectedOffer) ?? storePlaceholderImage(params.chainName);
  const caption = buildStoreCarouselCaption(params.chainName, detailedOffers.length, safeIndex, selectedOffer);
  const keyboard = storeCarouselKeyboard(params.language, params.chainCode, safeIndex, detailedOffers.length);

  if (params.messageId) {
    return await editTelegramPhotoMessage(params.chatId, params.messageId, imageUrl, caption, keyboard);
  }

  return await sendTelegramPhoto(params.chatId, imageUrl, caption, keyboard);
}

export async function sendStoreDetail(
  chatId: number,
  language: SupportedLanguage,
  notificationsEnabled: boolean,
  chainInput: string | null,
  snapshot: SubscriptionSnapshot,
) {
  if (!snapshot.subscriptionId || !snapshot.cityName) {
    await sendTelegramMessage(chatId, t(language, "first_choose_city_and_chains"), mainMenuKeyboard(language, notificationsEnabled));
    return;
  }

  if (!chainInput) {
    await sendTelegramMessage(chatId, t(language, "choose_store"), storeDetailKeyboard(language, snapshot.chainNames));
    return;
  }

  const chain = parseChainInput(chainInput);
  if (!chain) {
    await sendTelegramMessage(chatId, t(language, "cannot_recognize_store"), mainMenuKeyboard(language, notificationsEnabled));
    return;
  }

  if (!snapshot.chainCodes.includes(chain.code)) {
    await sendTelegramMessage(
      chatId,
      t(language, "store_not_in_selection", { store: chain.name }),
      mainMenuKeyboard(language, notificationsEnabled),
    );
    return;
  }

  queueDigestRefresh([chain.code]);
  const detailedOffers = await buildStoreDetail({
    chainCode: chain.code,
    language,
  });

  if (detailedOffers.length === 0) {
    await sendTelegramMessage(chatId, t(language, "no_detailed_offers", { store: chain.name }));
    return;
  }

  try {
    await sendOrEditStoreCarouselCard({
      chatId,
      chainCode: chain.code,
      chainName: getChainDisplayName(chain.code),
      language,
      index: 0,
    });
  } catch (error) {
    console.error("store carousel send failed", error);
    await sendTelegramMessage(chatId, detailedOffers[0].caption, mainMenuKeyboard(language, notificationsEnabled));
  }
}

function leafletPromptMessage(language: SupportedLanguage) {
  if (language === "uk") {
    return "Оберіть магазин, і я відкрию актуальний журнал знижок посторінково.";
  }
  if (language === "cs") {
    return "Vyberte obchod a otevřu aktuální leták po stránkách.";
  }
  if (language === "en") {
    return "Choose a store and I will open the current discount leaflet page by page.";
  }
  return "Выберите магазин, и я открою актуальный журнал скидок постранично.";
}

function noLeafletPagesMessage(language: SupportedLanguage, chainName: string) {
  if (language === "uk") {
    return `Не вдалося знайти актуальний журнал для ${chainName}. Спробуйте трохи пізніше.`;
  }
  if (language === "cs") {
    return `Aktuální leták pro ${chainName} se nepodařilo načíst. Zkuste to prosím později.`;
  }
  if (language === "en") {
    return `I could not load the current leaflet for ${chainName}. Please try again later.`;
  }
  return `Не удалось загрузить актуальный журнал для ${chainName}. Попробуйте позже.`;
}

export async function sendLeafletDetail(
  chatId: number,
  language: SupportedLanguage,
  notificationsEnabled: boolean,
  chainInput: string | null,
  snapshot: SubscriptionSnapshot,
) {
  if (!snapshot.subscriptionId || !snapshot.cityName) {
    await sendTelegramMessage(chatId, t(language, "first_choose_city_and_chains"), mainMenuKeyboard(language, notificationsEnabled));
    return;
  }

  if (!chainInput) {
    await sendTelegramMessage(chatId, leafletPromptMessage(language), storeDetailKeyboard(language, snapshot.chainNames));
    return;
  }

  const chain = parseChainInput(chainInput);
  if (!chain) {
    await sendTelegramMessage(chatId, t(language, "cannot_recognize_store"), mainMenuKeyboard(language, notificationsEnabled));
    return;
  }

  if (!snapshot.chainCodes.includes(chain.code)) {
    await sendTelegramMessage(
      chatId,
      t(language, "store_not_in_selection", { store: chain.name }),
      mainMenuKeyboard(language, notificationsEnabled),
    );
    return;
  }

  try {
    await sendOrEditLeafletCarouselCard({
      chatId,
      chainCode: chain.code,
      chainName: getChainDisplayName(chain.code),
      language,
      index: 0,
    });
    await sendTelegramMessage(
      chatId,
      t(language, "use_buttons_below"),
      mainMenuKeyboard(language, notificationsEnabled),
    );
    return;
  } catch (error) {
    console.error("leaflet carousel send failed", error);
  }

  await sendTelegramMessage(
    chatId,
    noLeafletPagesMessage(language, chain.name),
    mainMenuKeyboard(language, notificationsEnabled),
  );
}
