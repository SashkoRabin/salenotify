import { escapeHtml } from "./telegram.ts";
import { getLanguageName, t, type SupportedLanguage } from "./i18n.ts";

function joinLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

export function brandHeader(language: SupportedLanguage) {
  return `<b>${escapeHtml(t(language, "brand"))}</b>`;
}

export function welcomeMessage(language: SupportedLanguage) {
  return joinLines([
    brandHeader(language),
    "",
    t(language, "welcome_intro"),
    "",
    `<b>${escapeHtml(t(language, "subscription_enabled"))}</b>`,
    t(language, "choose_city_and_chains"),
  ]);
}

export function askLanguageMessage(language: SupportedLanguage) {
  return joinLines([
    `<b>${escapeHtml(t(language, "choose_language"))}</b>`,
    t(language, "language_button"),
  ]);
}

export function languageSavedMessage(language: SupportedLanguage) {
  return joinLines([
    t(language, "language_saved", { language: getLanguageName(language) }),
  ]);
}

export function askCityMessage(language: SupportedLanguage, cityExamples: string[]) {
  return joinLines([
    `<b>${escapeHtml(t(language, "choose_city"))}</b>`,
    t(language, "type_city", {
      examples: cityExamples.map((city) => `<code>${escapeHtml(city)}</code>`).join(", "),
    }),
  ]);
}

export function citySavedMessage(language: SupportedLanguage, cityName: string, chainNames: string[]) {
  return joinLines([
    `${t(language, "city_saved", { city: `<b>${escapeHtml(cityName)}</b>` })}`,
    "",
    `<b>${escapeHtml(t(language, "choose_chains"))}</b>`,
    t(language, "chains_available", { chains: chainNames.join(", ") }),
    t(language, "send_multiple_chains", { allChains: t(language, "all_chains") }),
  ]);
}

export function askChainsMessage(language: SupportedLanguage) {
  return joinLines([
    `<b>${escapeHtml(t(language, "choose_chains"))}</b>`,
    t(language, "send_multiple_chains", { allChains: t(language, "all_chains") }),
  ]);
}

export function setupDoneMessage(language: SupportedLanguage, cityName: string, chains: string[]) {
  return joinLines([
    `<b>${escapeHtml(t(language, "digest_ready"))}</b>`,
    `${escapeHtml(t(language, "city_label"))}: <b>${escapeHtml(cityName)}</b>`,
    `${escapeHtml(t(language, "chains_label"))}: <b>${escapeHtml(chains.join(", "))}</b>`,
    `${escapeHtml(t(language, "language_label"))}: <b>${escapeHtml(getLanguageName(language))}</b>`,
    "",
    t(language, "first_digest_below"),
    t(language, "daily_at_nine"),
    "",
    `${escapeHtml(t(language, "quick_actions"))}: <code>/today</code>, <code>/store kaufland</code>, <code>/status</code>, <code>/settings</code>.`,
  ]);
}

export function pausedMessage(language: SupportedLanguage) {
  return joinLines([
    `<b>${escapeHtml(t(language, "notifications_paused"))}</b>`,
    escapeHtml(t(language, "notifications_paused_hint")),
  ]);
}

export function resumedMessage(language: SupportedLanguage) {
  return joinLines([
    `<b>${escapeHtml(t(language, "notifications_resumed"))}</b>`,
    escapeHtml(t(language, "notifications_resumed_hint")),
  ]);
}

export function settingsMessage(
  language: SupportedLanguage,
  cityName: string | null,
  chains: string[],
  enabled: boolean,
  categoryLabels: string[] = [],
) {
  return joinLines([
    brandHeader(language),
    "",
    `${escapeHtml(t(language, "status_title"))}: <b>${escapeHtml(enabled ? t(language, "status_active") : t(language, "status_paused"))}</b>`,
    `${escapeHtml(t(language, "city_label"))}: <b>${escapeHtml(cityName ?? t(language, "not_selected"))}</b>`,
    `${escapeHtml(t(language, "chains_label"))}: <b>${escapeHtml(chains.length > 0 ? chains.join(", ") : t(language, "not_selected"))}</b>`,
    `${escapeHtml(t(language, "language_label"))}: <b>${escapeHtml(getLanguageName(language))}</b>`,
    categoryLabels.length > 0
      ? `⭐ <b>${escapeHtml(categoryLabels.join(", "))}</b>`
      : null,
    "",
    escapeHtml(t(language, "use_buttons_below")),
  ]);
}

export function statusMessage(
  language: SupportedLanguage,
  cityName: string | null,
  chains: string[],
  enabled: boolean,
  categoryLabels: string[] = [],
) {
  return joinLines([
    `<b>${escapeHtml(t(language, "status_title"))}</b>`,
    `${escapeHtml(t(language, "settings_title"))}: <b>${escapeHtml(enabled ? t(language, "status_active") : t(language, "status_paused"))}</b>`,
    `${escapeHtml(t(language, "city_label"))}: <b>${escapeHtml(cityName ?? t(language, "not_selected"))}</b>`,
    `${escapeHtml(t(language, "chains_label"))}: <b>${escapeHtml(chains.length > 0 ? chains.join(", ") : t(language, "not_selected"))}</b>`,
    `${escapeHtml(t(language, "language_label"))}: <b>${escapeHtml(getLanguageName(language))}</b>`,
    categoryLabels.length > 0
      ? `⭐ <b>${escapeHtml(categoryLabels.join(", "))}</b>`
      : null,
    "",
    escapeHtml(t(language, "manual_today")),
  ]);
}

export function previewDigestMessage(language: SupportedLanguage, cityName: string, chains: string[]) {
  return joinLines([
    `<b>${escapeHtml(cityName)}</b>`,
    `${escapeHtml(t(language, "chains_label"))}: <b>${escapeHtml(chains.join(", "))}</b>`,
    "",
    `<i>${escapeHtml(t(language, "no_fresh_offers"))}</i>`,
  ]);
}
