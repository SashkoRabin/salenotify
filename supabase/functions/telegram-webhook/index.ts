declare const Deno: {
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

import {
  getCategoryLabel,
  getUserCategoryPreferences,
  parseCategoryInput,
  removeUserCategoryPreference,
  saveUserCategoryPreference,
  type ProductCategoryKey,
} from "../_shared/categories.ts";
import { CZECH_CITIES, findCityByInput, findCitySuggestions, parseChains, SUPPORTED_CHAINS } from "../_shared/catalog.ts";
import { config } from "../_shared/config.ts";
import {
  askChainsMessage,
  askCityMessage,
  askLanguageMessage,
  citySavedMessage,
  languageSavedMessage,
  pausedMessage,
  resumedMessage,
  setupDoneMessage,
  statusMessage,
  welcomeMessage,
} from "../_shared/copy.ts";
import { db } from "../_shared/db.ts";
import { getChainDisplayName } from "../_shared/digest.ts";
import {
  formatCategoryPreferencesMessage,
  queueDigestRefresh,
  sendCategoryComparison,
  sendPreferencesScreen,
  sendSettingsScreen,
  sendTodayDigest,
} from "../_shared/digest-actions.ts";
import {
  sendLeafletDetail,
  sendOrEditLeafletCarouselCard,
  sendOrEditStoreCarouselCard,
  sendStoreDetail,
} from "../_shared/store-carousel.ts";
import {
  answerTelegramCallbackQuery,
  categoryKeyboard,
  categoryPreferencesInlineKeyboard,
  chainsKeyboard,
  editTelegramTextMessage,
  languageKeyboard,
  mainMenuKeyboard,
  removeKeyboard,
  sendTelegramMessage,
  settingsKeyboard,
  settingsPreferencesKeyboard,
} from "../_shared/telegram.ts";
import {
  mapLocalizedCommand,
  normalizeSupportedLanguage,
  t,
  type SupportedLanguage,
} from "../_shared/i18n.ts";
import type { TelegramUpdate } from "../_shared/types.ts";
import {
  ensureUserProfile,
  getActiveSubscriptionSnapshot,
  getUserLanguage,
  getUserRecord,
  saveSubscriptionChains,
  setNotificationsEnabled,
  setOnboardingStep,
  setUserLanguage,
  upsertSubscription,
  type SubscriptionSnapshot,
  type UserRecord,
} from "../_shared/user-state.ts";

type TelegramUser = NonNullable<TelegramUpdate["message"]>["from"];

type RequestContext = {
  update: TelegramUpdate;
  chatId: number;
  from: NonNullable<TelegramUser>;
  user: UserRecord;
  snapshot: SubscriptionSnapshot;
  language: SupportedLanguage;
  text: string | null;
  rawText: string | null;
  callbackData: string | null;
};

type ActiveSubscriptionRow = {
  id: string;
  cities: {
    name: string;
  };
};

const processedUpdates = new Map<number, number>();
const updateTtlMs = 5 * 60 * 1000;
const popularCityNames = () => CZECH_CITIES.slice(0, 6).map((city) => city.name);

function ok(message = "OK") {
  return new Response(message, { status: 200 });
}

function normalizeCommandInput(value: string | undefined) {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }

  if (raw.startsWith("/")) {
    return raw.toLowerCase();
  }

  if (parseCategoryInput(raw)) {
    return "/category";
  }

  return mapLocalizedCommand(raw)?.trim() ?? null;
}

async function markUpdateProcessed(updateId: number) {
  const now = Date.now();

  for (const [storedUpdateId, expiresAt] of processedUpdates.entries()) {
    if (expiresAt <= now) {
      processedUpdates.delete(storedUpdateId);
    }
  }

  if (processedUpdates.has(updateId)) {
    return false;
  }

  processedUpdates.set(updateId, now + updateTtlMs);
  return true;
}

function temporaryErrorMessage(language: SupportedLanguage) {
  if (language === "uk") {
    return "Сталася тимчасова помилка. Спробуйте ще раз через кілька секунд.";
  }
  if (language === "cs") {
    return "Došlo k dočasné chybě. Zkuste to prosím znovu za pár sekund.";
  }
  if (language === "en") {
    return "A temporary error occurred. Please try again in a few seconds.";
  }
  return "Произошла временная ошибка. Попробуйте еще раз через несколько секунд.";
}

function categoryPromptMessage(language: SupportedLanguage) {
  if (language === "uk") {
    return "Оберіть категорію, і я покажу найкращі пропозиції по всіх магазинах.";
  }
  if (language === "cs") {
    return "Vyberte kategorii a ukážu nejlepší nabídky napříč obchody.";
  }
  if (language === "en") {
    return "Choose a category and I will show the best offers across stores.";
  }
  return "Выберите категорию, и я покажу лучшие предложения по всем магазинам.";
}

async function buildContext(update: TelegramUpdate): Promise<RequestContext | null> {
  const callbackData = update.callback_query?.data?.trim() ?? null;
  const text = normalizeCommandInput(update.message?.text);
  const rawText = update.message?.text?.trim() ?? null;
  const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id ?? null;
  const from = update.message?.from ?? update.callback_query?.from;

  if (!chatId || !from) {
    return null;
  }

  await ensureUserProfile({
    telegramUserId: from.id,
    chatId,
    username: from.username,
    firstName: from.first_name,
    lastName: from.last_name,
    telegramLanguageCode: from.language_code,
  });

  const user = await getUserRecord(from.id);
  const language = getUserLanguage(user, from.language_code);
  const snapshot = await getActiveSubscriptionSnapshot(user.id);

  return {
    update,
    chatId,
    from,
    user,
    snapshot,
    language,
    text,
    rawText,
    callbackData,
  };
}

async function handlePreferencesCallback(ctx: RequestContext) {
  const data = ctx.callbackData;
  if (!data?.startsWith("prefs:")) {
    return false;
  }

  const callback = ctx.update.callback_query!;
  const messageId = callback.message?.message_id;
  if (!messageId) {
    await answerTelegramCallbackQuery(callback.id);
    return true;
  }

  if (data === "prefs:open") {
    const selected = await getUserCategoryPreferences(ctx.user.id);
    await answerTelegramCallbackQuery(callback.id);
    await editTelegramTextMessage(
      ctx.chatId,
      messageId,
      formatCategoryPreferencesMessage(ctx.language, selected),
      categoryPreferencesInlineKeyboard(ctx.language, selected),
      callback.inline_message_id,
    );
    return true;
  }

  if (data === "prefs:done") {
    const selected = await getUserCategoryPreferences(ctx.user.id);
    await answerTelegramCallbackQuery(callback.id, t(ctx.language, "preferences_categories_saved"));
    await editTelegramTextMessage(
      ctx.chatId,
      messageId,
      formatCategoryPreferencesMessage(ctx.language, selected),
      settingsPreferencesKeyboard(ctx.language),
      callback.inline_message_id,
    );
    return true;
  }

  if (!data.startsWith("prefs:toggle:")) {
    return false;
  }

  const categoryKey = data.replace("prefs:toggle:", "") as ProductCategoryKey;
  const selected = await getUserCategoryPreferences(ctx.user.id);
  const wasSelected = selected.includes(categoryKey);

  if (wasSelected) {
    await removeUserCategoryPreference(ctx.user.id, categoryKey);
  } else {
    await saveUserCategoryPreference(ctx.user.id, categoryKey);
  }

  const nextSelected = await getUserCategoryPreferences(ctx.user.id);
  await answerTelegramCallbackQuery(
    callback.id,
    t(ctx.language, wasSelected ? "category_removed" : "category_added", {
      category: getCategoryLabel(ctx.language, categoryKey),
    }),
  );
  await editTelegramTextMessage(
    ctx.chatId,
    messageId,
    formatCategoryPreferencesMessage(ctx.language, nextSelected),
    categoryPreferencesInlineKeyboard(ctx.language, nextSelected),
    callback.inline_message_id,
  );
  return true;
}

async function handleCarouselCallback(ctx: RequestContext) {
  const data = ctx.callbackData;
  if (!data?.startsWith("store:") && !data?.startsWith("leaflet:")) {
    return false;
  }

  const callback = ctx.update.callback_query!;
  await answerTelegramCallbackQuery(callback.id);

  if (data.endsWith(":noop")) {
    return true;
  }

  const [kind, chainCode, indexRaw] = data.split(":");
  const messageId = callback.message?.message_id;
  if (!messageId || !ctx.snapshot.chainCodes.includes(chainCode)) {
    return true;
  }

  const params = {
    chatId: ctx.chatId,
    messageId,
    chainCode,
    chainName: getChainDisplayName(chainCode),
    language: ctx.language,
    index: Number(indexRaw ?? "0"),
  };

  if (kind === "store") {
    queueDigestRefresh([chainCode]);
    await sendOrEditStoreCarouselCard(params);
  } else {
    await sendOrEditLeafletCarouselCard(params);
  }

  return true;
}

async function handleSimpleCommand(ctx: RequestContext) {
  const { chatId, from, language, snapshot, text, user } = ctx;

  if (text === "/start") {
    await setOnboardingStep(from.id, "awaiting_language");
    await sendTelegramMessage(chatId, welcomeMessage(language), languageKeyboard());
    await sendTelegramMessage(chatId, askLanguageMessage(language), languageKeyboard());
    return true;
  }

  if (text === "/language") {
    await setOnboardingStep(from.id, "awaiting_language");
    await sendTelegramMessage(chatId, askLanguageMessage(language), languageKeyboard());
    return true;
  }

  if (text === "/back") {
    await setOnboardingStep(from.id, "ready");
    await sendTelegramMessage(chatId, t(language, "use_buttons_below"), mainMenuKeyboard(language, user.notifications_enabled));
    return true;
  }

  if (text === "/categories") {
    await setOnboardingStep(from.id, "awaiting_category");
    await sendTelegramMessage(chatId, categoryPromptMessage(language), categoryKeyboard(language));
    return true;
  }

  if (text === "/pause") {
    await setNotificationsEnabled(from.id, false);
    await sendTelegramMessage(chatId, pausedMessage(language), settingsKeyboard(language, false));
    return true;
  }

  if (text === "/resume") {
    await setNotificationsEnabled(from.id, true);
    await sendTelegramMessage(chatId, resumedMessage(language), settingsKeyboard(language, true));
    return true;
  }

  if (text === "/city") {
    await setOnboardingStep(from.id, "awaiting_city");
    await sendTelegramMessage(chatId, askCityMessage(language, popularCityNames()), removeKeyboard());
    return true;
  }

  if (text === "/today") {
    if (user.onboarding_step === "awaiting_store_detail") {
      await setOnboardingStep(from.id, "ready");
    }
    await sendTodayDigest(chatId, user.id, language, user.notifications_enabled, snapshot);
    return true;
  }

  if (text === "/chains") {
    if (!snapshot.subscriptionId) {
      await sendTelegramMessage(chatId, t(language, "first_choose_city"), mainMenuKeyboard(language, user.notifications_enabled));
      return true;
    }

    await setOnboardingStep(from.id, "awaiting_chains");
    await sendTelegramMessage(chatId, askChainsMessage(language), chainsKeyboard(language));
    return true;
  }

  if (text === "/status") {
    const categoryLabels = (await getUserCategoryPreferences(user.id)).map((key) => getCategoryLabel(language, key));
    await sendTelegramMessage(
      chatId,
      statusMessage(language, snapshot.cityName, snapshot.chainNames, user.notifications_enabled, categoryLabels),
      mainMenuKeyboard(language, user.notifications_enabled),
    );
    return true;
  }

  if (text === "/settings") {
    await sendSettingsScreen(chatId, user.id, language, user.notifications_enabled, snapshot);
    return true;
  }

  if (text === "/preferences") {
    await sendPreferencesScreen(chatId, user.id, language);
    return true;
  }

  return false;
}

async function handleStoreCommands(ctx: RequestContext) {
  const storeMatch = ctx.text?.match(/^\/store(?:@[\w_]+)?\s+(.+)$/);
  const leafletMatch = ctx.text?.match(/^\/more(?:@[\w_]+)?\s+(.+)$/);

  if (ctx.text === "/store" || storeMatch) {
    const chainInput = storeMatch?.[1]?.trim() ?? null;
    if (!chainInput) {
      await setOnboardingStep(ctx.from.id, "awaiting_store_detail");
    }
    await sendStoreDetail(ctx.chatId, ctx.language, ctx.user.notifications_enabled, chainInput, ctx.snapshot);
    return true;
  }

  if (ctx.text === "/more" || leafletMatch) {
    const chainInput = leafletMatch?.[1]?.trim() ?? null;
    if (!chainInput) {
      await setOnboardingStep(ctx.from.id, "awaiting_leaflet_detail");
    }
    await sendLeafletDetail(ctx.chatId, ctx.language, ctx.user.notifications_enabled, chainInput, ctx.snapshot);
    return true;
  }

  return false;
}

async function handleLanguageStep(ctx: RequestContext) {
  const { chatId, from, rawText, user } = ctx;
  if (user.onboarding_step !== "awaiting_language" || !rawText || rawText.startsWith("/")) {
    return false;
  }

  const selectedLanguage = normalizeSupportedLanguage(rawText);
  if (!selectedLanguage) {
    await sendTelegramMessage(chatId, askLanguageMessage(ctx.language), languageKeyboard());
    return true;
  }

  await setUserLanguage(from.id, selectedLanguage);

  if (ctx.snapshot.subscriptionId && ctx.snapshot.cityName) {
    await setOnboardingStep(from.id, "ready");
    await sendTelegramMessage(
      chatId,
      languageSavedMessage(selectedLanguage),
      mainMenuKeyboard(selectedLanguage, user.notifications_enabled),
    );
    await sendSettingsScreen(chatId, user.id, selectedLanguage, user.notifications_enabled, ctx.snapshot);
    return true;
  }

  await setOnboardingStep(from.id, "awaiting_city");
  await sendTelegramMessage(chatId, languageSavedMessage(selectedLanguage), removeKeyboard());
  await sendTelegramMessage(chatId, askCityMessage(selectedLanguage, popularCityNames()), removeKeyboard());
  return true;
}

async function handleCityInput(ctx: RequestContext) {
  const typedText = ctx.rawText ?? "";
  const cityMatch = ctx.text?.match(/^\/city(?:@[\w_]+)?\s+(.+)$/);
  const shouldHandle =
    Boolean(cityMatch) ||
    (
      typedText !== "" &&
      !typedText.startsWith("/") &&
      (ctx.user.onboarding_step === "awaiting_city" || findCityByInput(typedText) !== undefined)
    );

  if (!shouldHandle) {
    return false;
  }

  const cityInput = cityMatch?.[1]?.trim() ?? typedText;
  const city = findCityByInput(cityInput);

  if (!city) {
    const suggestions = findCitySuggestions(cityInput);
    const message = suggestions.length > 0
      ? [
          t(ctx.language, "cannot_recognize_city"),
          t(ctx.language, "city_suggestions", { cities: suggestions.map((item) => item.name).join(", ") }),
          t(ctx.language, "send_one_variant"),
        ].join("\n")
      : [
          t(ctx.language, "cannot_recognize_city"),
          t(ctx.language, "city_try_examples", {
            cities: CZECH_CITIES.slice(0, 10).map((item) => item.name).join(", "),
          }),
        ].join("\n");

    await sendTelegramMessage(ctx.chatId, message);
    return true;
  }

  const { subscriptionId, cityName } = await upsertSubscription(ctx.user.id, city.slug);
  await saveSubscriptionChains(subscriptionId, []);
  await setOnboardingStep(ctx.from.id, "awaiting_chains");
  await sendTelegramMessage(
    ctx.chatId,
    citySavedMessage(ctx.language, cityName, SUPPORTED_CHAINS.map((chain) => chain.name)),
    chainsKeyboard(ctx.language),
  );
  return true;
}

async function handleChainsStep(ctx: RequestContext) {
  const { chatId, from, language, rawText, user } = ctx;
  if (user.onboarding_step !== "awaiting_chains" || !rawText || rawText.startsWith("/")) {
    return false;
  }

  const selectedChains = parseChains(rawText);
  if (selectedChains.length === 0) {
    await sendTelegramMessage(chatId, t(language, "cannot_recognize_chains"));
    return true;
  }

  const { data, error } = await db
    .from("subscriptions")
    .select("id, cities!inner(name)")
    .eq("user_id", user.id)
    .eq("enabled", true)
    .single();

  if (error) {
    throw error;
  }

  const activeSubscription = data as unknown as ActiveSubscriptionRow;
  await saveSubscriptionChains(activeSubscription.id, selectedChains.map((chain) => chain.code));
  await setOnboardingStep(from.id, "ready");

  const nextSnapshot = await getActiveSubscriptionSnapshot(user.id);
  await sendTelegramMessage(
    chatId,
    setupDoneMessage(language, activeSubscription.cities.name, selectedChains.map((chain) => chain.name)),
    mainMenuKeyboard(language, true),
  );
  await sendTodayDigest(chatId, user.id, language, true, nextSnapshot);
  return true;
}

async function handleCategoryCommandOrStep(ctx: RequestContext) {
  if (ctx.text === "/category") {
    await sendCategoryComparison(
      ctx.chatId,
      ctx.language,
      ctx.user.notifications_enabled,
      ctx.rawText ?? "",
      ctx.snapshot,
    );
    if (ctx.user.onboarding_step === "awaiting_category") {
      await setOnboardingStep(ctx.from.id, "ready");
    }
    return true;
  }

  if (ctx.user.onboarding_step !== "awaiting_category" || !ctx.rawText || ctx.rawText.startsWith("/")) {
    return false;
  }

  await setOnboardingStep(ctx.from.id, "ready");
  await sendCategoryComparison(
    ctx.chatId,
    ctx.language,
    ctx.user.notifications_enabled,
    ctx.rawText,
    ctx.snapshot,
  );
  return true;
}

async function handlePendingDetailStep(ctx: RequestContext) {
  const { chatId, from, language, rawText, snapshot, user } = ctx;
  if (!rawText || rawText.startsWith("/")) {
    return false;
  }

  if (user.onboarding_step === "awaiting_store_detail") {
    await setOnboardingStep(from.id, "ready");
    await sendStoreDetail(chatId, language, user.notifications_enabled, rawText, snapshot);
    return true;
  }

  if (user.onboarding_step === "awaiting_leaflet_detail") {
    await setOnboardingStep(from.id, "ready");
    await sendLeafletDetail(chatId, language, user.notifications_enabled, rawText, snapshot);
    return true;
  }

  return false;
}

async function handleUpdate(ctx: RequestContext) {
  const handlers = [
    handlePreferencesCallback,
    handleCarouselCallback,
    handleSimpleCommand,
    handleStoreCommands,
    handleLanguageStep,
    handleCityInput,
    handleChainsStep,
    handleCategoryCommandOrStep,
    handlePendingDetailStep,
  ];

  for (const handler of handlers) {
    if (await handler(ctx)) {
      return;
    }
  }

  await sendTelegramMessage(
    ctx.chatId,
    t(ctx.language, "supported_commands"),
    mainMenuKeyboard(ctx.language, ctx.user.notifications_enabled),
  );
}

Deno.serve(async (request: Request) => {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== config.telegramWebhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let chatId: number | null = null;
  let fallbackLanguage: SupportedLanguage = "ru";

  try {
    const update = (await request.json()) as TelegramUpdate;
    const accepted = await markUpdateProcessed(update.update_id);
    if (!accepted) {
      return ok("Duplicate ignored");
    }

    const ctx = await buildContext(update);
    if (!ctx) {
      return ok("Ignored");
    }

    chatId = ctx.chatId;
    fallbackLanguage = ctx.language;
    await handleUpdate(ctx);
    return ok();
  } catch (error) {
    console.error("telegram-webhook failed", error);

    if (chatId) {
      try {
        await sendTelegramMessage(chatId, temporaryErrorMessage(fallbackLanguage));
      } catch (sendError) {
        console.error("telegram-webhook fallback send failed", sendError);
      }
    }

    return ok();
  }
});
