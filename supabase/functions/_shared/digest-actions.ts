import {
  getCategoryLabel,
  getUserCategoryPreferences,
  parseCategoryInput,
  type ProductCategoryKey,
} from "./categories.ts";
import {
  buildCategoryComparison,
  buildDigestMessage,
  refreshDigestSources,
} from "./digest.ts";
import {
  categoryKeyboard,
  categoryPreferencesInlineKeyboard,
  escapeHtml,
  mainMenuKeyboard,
  sendTelegramMessage,
  sendTelegramMessageChunks,
  settingsKeyboard,
} from "./telegram.ts";
import { settingsMessage } from "./copy.ts";
import { t, type SupportedLanguage } from "./i18n.ts";
import type { SubscriptionSnapshot } from "./user-state.ts";

export function queueDigestRefresh(chainCodes: string[]) {
  if (chainCodes.length === 0) {
    return;
  }

  void refreshDigestSources(chainCodes).catch((error) => {
    console.error("queued digest refresh failed", error);
  });
}

export function formatCategoryPreferencesMessage(
  language: SupportedLanguage,
  selectedCategoryKeys: ProductCategoryKey[],
) {
  const selectedLine = selectedCategoryKeys.length > 0
    ? selectedCategoryKeys.map((key) => getCategoryLabel(language, key)).join(", ")
    : t(language, "no_categories_selected");

  return [
    `<b>${t(language, "preferences_categories")}</b>`,
    escapeHtml(t(language, "preferences_categories_description")),
    escapeHtml(t(language, "preferences_categories_toggle_hint")),
    "",
    `<b>${escapeHtml(t(language, "selected_categories"))}</b> ${escapeHtml(selectedLine)}`,
  ].join("\n");
}

export async function sendSettingsScreen(
  chatId: number,
  userId: string,
  language: SupportedLanguage,
  notificationsEnabled: boolean,
  snapshot: Pick<SubscriptionSnapshot, "cityName" | "chainNames">,
) {
  const selectedCategoryKeys = await getUserCategoryPreferences(userId);
  const categoryLabels = selectedCategoryKeys.map((key) => getCategoryLabel(language, key));
  await sendTelegramMessage(
    chatId,
    settingsMessage(language, snapshot.cityName, snapshot.chainNames, notificationsEnabled, categoryLabels),
    settingsKeyboard(language, notificationsEnabled),
  );
}

export async function sendPreferencesScreen(
  chatId: number,
  userId: string,
  language: SupportedLanguage,
) {
  const selectedCategoryKeys = await getUserCategoryPreferences(userId);
  await sendTelegramMessage(
    chatId,
    formatCategoryPreferencesMessage(language, selectedCategoryKeys),
    categoryPreferencesInlineKeyboard(language, selectedCategoryKeys),
  );
}

export async function sendTodayDigest(
  chatId: number,
  userId: string,
  language: SupportedLanguage,
  notificationsEnabled: boolean,
  snapshot: SubscriptionSnapshot,
) {
  if (!snapshot.subscriptionId || !snapshot.cityName) {
    await sendTelegramMessage(
      chatId,
      t(language, "first_choose_city_and_chains"),
      mainMenuKeyboard(language, notificationsEnabled),
    );
    return;
  }

  queueDigestRefresh(snapshot.chainCodes);
  const preferredCategoryKeys = await getUserCategoryPreferences(userId);

  const text = await buildDigestMessage({
    cityName: snapshot.cityName,
    selectedCodes: snapshot.chainCodes,
    selectedChains: snapshot.chainNames,
    language,
    preferredCategoryKeys,
  });

  await sendTelegramMessageChunks(chatId, text, mainMenuKeyboard(language, notificationsEnabled));
}

export async function sendCategoryComparison(
  chatId: number,
  language: SupportedLanguage,
  notificationsEnabled: boolean,
  categoryInput: string,
  snapshot: SubscriptionSnapshot,
) {
  if (!snapshot.subscriptionId || !snapshot.cityName) {
    await sendTelegramMessage(
      chatId,
      t(language, "first_choose_city_and_chains"),
      mainMenuKeyboard(language, notificationsEnabled),
    );
    return;
  }

  const categoryKey = parseCategoryInput(categoryInput);
  if (!categoryKey) {
    await sendTelegramMessage(
      chatId,
      "Р’С‹Р±РµСЂРёС‚Рµ РєР°С‚РµРіРѕСЂРёСЋ РєРЅРѕРїРєРѕР№ РЅРёР¶Рµ.",
      categoryKeyboard(language),
    );
    return;
  }

  queueDigestRefresh(snapshot.chainCodes);

  const text = await buildCategoryComparison({
    categoryKey,
    selectedCodes: snapshot.chainCodes,
    selectedChains: snapshot.chainNames,
    language,
    cityName: snapshot.cityName,
  });

  await sendTelegramMessageChunks(chatId, text, mainMenuKeyboard(language, notificationsEnabled));
}
