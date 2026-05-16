import { getCategoriesMenuLabel, getCategoryOptions, type ProductCategoryKey } from "./categories.ts";
import { config } from "./config.ts";
import { getLanguageOptions, t, type SupportedLanguage } from "./i18n.ts";

type ReplyKeyboardMarkup = {
  keyboard: Array<Array<{ text: string }>>;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
};

type ReplyKeyboardRemove = {
  remove_keyboard: true;
};

type InlineKeyboardMarkup = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};

type TelegramReplyMarkup = ReplyKeyboardMarkup | ReplyKeyboardRemove | InlineKeyboardMarkup;

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
) {
  const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendMessage failed: ${response.status} ${body}`);
  }

  return await response.json();
}

export function splitTelegramMessage(text: string, maxLength = 3900) {
  if (text.length <= maxLength) {
    return [text];
  }

  const parts: string[] = [];
  let current = "";

  for (const block of text.split("\n\n")) {
    const next = current ? `${current}\n\n${block}` : block;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) {
      parts.push(current);
      current = "";
    }

    if (block.length <= maxLength) {
      current = block;
      continue;
    }

    const lines = block.split("\n");
    let chunk = "";
    for (const line of lines) {
      const withLine = chunk ? `${chunk}\n${line}` : line;
      if (withLine.length <= maxLength) {
        chunk = withLine;
      } else {
        if (chunk) {
          parts.push(chunk);
        }
        chunk = line;
      }
    }

    if (chunk) {
      current = chunk;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

export async function sendTelegramMessageChunks(
  chatId: number,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
) {
  const chunks = splitTelegramMessage(text);

  for (const [index, chunk] of chunks.entries()) {
    await sendTelegramMessage(chatId, chunk, index === chunks.length - 1 ? replyMarkup : undefined);
  }
}

export async function sendTelegramPhoto(
  chatId: number,
  photoUrl: string,
  caption?: string,
  replyMarkup?: TelegramReplyMarkup,
) {
  const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendPhoto`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendPhoto failed: ${response.status} ${body}`);
  }

  return await response.json();
}

export async function editTelegramPhotoMessage(
  chatId: number,
  messageId: number,
  photoUrl: string,
  caption?: string,
  replyMarkup?: TelegramReplyMarkup,
) {
  const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/editMessageMedia`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      media: {
        type: "photo",
        media: photoUrl,
        caption,
        parse_mode: "HTML",
      },
      reply_markup: replyMarkup,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram editMessageMedia failed: ${response.status} ${body}`);
  }

  return await response.json();
}

export async function editTelegramTextMessage(
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
  inlineMessageId?: string,
) {
  const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/editMessageText`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(
      inlineMessageId
        ? {
            inline_message_id: inlineMessageId,
            text,
            parse_mode: text.includes("<") ? "HTML" : undefined,
            reply_markup: replyMarkup,
          }
        : {
            chat_id: chatId,
            message_id: messageId,
            text,
            parse_mode: text.includes("<") ? "HTML" : undefined,
            reply_markup: replyMarkup,
          },
    ),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram editMessageText failed: ${response.status} ${body}`);
  }

  return await response.json();
}

export async function answerTelegramCallbackQuery(callbackQueryId: string, text?: string) {
  const payload: Record<string, unknown> = { callback_query_id: callbackQueryId };
  if (text) {
    payload.text = text;
  }

  const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram answerCallbackQuery failed: ${response.status} ${body}`);
  }

  return await response.json();
}

export function languageKeyboard() {
  const options = getLanguageOptions();
  return {
    keyboard: [
      [{ text: options[0].label }, { text: options[1].label }],
      [{ text: options[2].label }, { text: options[3].label }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  } satisfies ReplyKeyboardMarkup;
}

export function chainsKeyboard(language: SupportedLanguage) {
  return {
    keyboard: [
      [{ text: "Kaufland" }, { text: "Lidl" }],
      [{ text: "Albert" }, { text: "BILLA" }],
      [{ text: "PENNY" }, { text: t(language, "all_chains") }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  } satisfies ReplyKeyboardMarkup;
}

export function mainMenuKeyboard(language: SupportedLanguage, notificationsEnabled: boolean) {
  return {
    keyboard: [
      [{ text: t(language, "today_button") }, { text: getCategoriesMenuLabel(language) }],
      [{ text: t(language, "more_button") }, { text: t(language, "settings_button") }],
    ],
    resize_keyboard: true,
  } satisfies ReplyKeyboardMarkup;
}

export function settingsKeyboard(language: SupportedLanguage, notificationsEnabled: boolean) {
  return {
    keyboard: [
      [{ text: t(language, "city_button") }, { text: t(language, "chains_button") }],
      [{ text: t(language, "preferences_categories") }, { text: t(language, "language_button") }],
      [{ text: t(language, "status_button") }, { text: notificationsEnabled ? t(language, "pause_button") : t(language, "resume_button") }],
      [{ text: t(language, "back_button") }],
    ],
    resize_keyboard: true,
  } satisfies ReplyKeyboardMarkup;
}

export function storeDetailKeyboard(language: SupportedLanguage, chainNames: string[]) {
  const rows = chainNames.reduce<Array<Array<{ text: string }>>>((acc, chainName, index) => {
    const rowIndex = Math.floor(index / 2);
    acc[rowIndex] ??= [];
    acc[rowIndex].push({ text: chainName });
    return acc;
  }, []);

  rows.push([{ text: t(language, "back_button") }]);

  return {
    keyboard: rows,
    resize_keyboard: true,
    one_time_keyboard: true,
  } satisfies ReplyKeyboardMarkup;
}

export function storeCarouselKeyboard(
  _language: SupportedLanguage,
  chainCode: string,
  index: number,
  total: number,
) {
  const previousIndex = index > 0 ? index - 1 : total - 1;
  const nextIndex = index < total - 1 ? index + 1 : 0;

  return {
    inline_keyboard: [[
      { text: "◀", callback_data: `store:${chainCode}:${previousIndex}` },
      { text: `${index + 1}/${total}`, callback_data: "store:noop" },
      { text: "▶", callback_data: `store:${chainCode}:${nextIndex}` },
    ]],
  } satisfies InlineKeyboardMarkup;
}

export function categoryKeyboard(language: SupportedLanguage, _withDone = false) {
  const options = getCategoryOptions(language);
  return {
    keyboard: [
      [{ text: options[0].text }, { text: options[1].text }],
      [{ text: options[2].text }, { text: options[3].text }],
      [{ text: options[4].text }, { text: options[5].text }],
      [{ text: options[6].text }, { text: options[7].text }],
      [{ text: t(language, "back_button") }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  } satisfies ReplyKeyboardMarkup;
}

export function categoryPreferencesInlineKeyboard(
  language: SupportedLanguage,
  selectedCategoryKeys: ProductCategoryKey[],
) {
  const selected = new Set(selectedCategoryKeys);
  const options = getCategoryOptions(language);
  return {
    inline_keyboard: [
      [
        {
          text: `${selected.has(options[0].key) ? "✅" : "⬜"} ${options[0].text}`,
          callback_data: `prefs:toggle:${options[0].key}`,
        },
        {
          text: `${selected.has(options[1].key) ? "✅" : "⬜"} ${options[1].text}`,
          callback_data: `prefs:toggle:${options[1].key}`,
        },
      ],
      [
        {
          text: `${selected.has(options[2].key) ? "✅" : "⬜"} ${options[2].text}`,
          callback_data: `prefs:toggle:${options[2].key}`,
        },
        {
          text: `${selected.has(options[3].key) ? "✅" : "⬜"} ${options[3].text}`,
          callback_data: `prefs:toggle:${options[3].key}`,
        },
      ],
      [
        {
          text: `${selected.has(options[4].key) ? "✅" : "⬜"} ${options[4].text}`,
          callback_data: `prefs:toggle:${options[4].key}`,
        },
        {
          text: `${selected.has(options[5].key) ? "✅" : "⬜"} ${options[5].text}`,
          callback_data: `prefs:toggle:${options[5].key}`,
        },
      ],
      [
        {
          text: `${selected.has(options[6].key) ? "✅" : "⬜"} ${options[6].text}`,
          callback_data: `prefs:toggle:${options[6].key}`,
        },
        {
          text: `${selected.has(options[7].key) ? "✅" : "⬜"} ${options[7].text}`,
          callback_data: `prefs:toggle:${options[7].key}`,
        },
      ],
      [
        { text: t(language, "done_button"), callback_data: "prefs:done" },
      ],
    ],
  } satisfies InlineKeyboardMarkup;
}

export function parseCategorySelectionState(state: string) {
  if (!state) {
    return [] as ProductCategoryKey[];
  }

  return state
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is ProductCategoryKey => Boolean(item));
}

export function toggleCategorySelectionState(state: string, key: ProductCategoryKey) {
  const selected = new Set(parseCategorySelectionState(state));
  if (selected.has(key)) {
    selected.delete(key);
  } else {
    selected.add(key);
  }

  return Array.from(selected).join(",");
}

export function settingsPreferencesKeyboard(language: SupportedLanguage) {
  return {
    inline_keyboard: [[
      { text: t(language, "preferences_categories"), callback_data: "prefs:open" },
    ]],
  } satisfies InlineKeyboardMarkup;
}

export function removeKeyboard() {
  return {
    remove_keyboard: true,
  } satisfies ReplyKeyboardRemove;
}

export function leafletCarouselKeyboard(
  _language: SupportedLanguage,
  chainCode: string,
  index: number,
  total: number,
) {
  const previousIndex = index > 0 ? index - 1 : total - 1;
  const nextIndex = index < total - 1 ? index + 1 : 0;

  return {
    inline_keyboard: [[
      { text: "◀", callback_data: `leaflet:${chainCode}:${previousIndex}` },
      { text: `${index + 1}/${total}`, callback_data: "leaflet:noop" },
      { text: "▶", callback_data: `leaflet:${chainCode}:${nextIndex}` },
    ]],
  } satisfies InlineKeyboardMarkup;
}
