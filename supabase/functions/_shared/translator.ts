import { config } from "./config.ts";
import type { SupportedLanguage } from "./i18n.ts";

type TranslateMap = Map<string, string>;
const translationCache = new Map<string, string>();

function deeplTargetLanguage(language: SupportedLanguage) {
  switch (language) {
    case "ru":
      return "RU";
    case "uk":
      return "UK";
    case "cs":
      return "CS";
    case "en":
      return "EN";
  }
}

async function translateWithDeepL(texts: string[], language: SupportedLanguage): Promise<string[] | null> {
  if (!config.deeplApiKey || texts.length === 0) {
    return null;
  }

  const form = new URLSearchParams();
  form.set("target_lang", deeplTargetLanguage(language));

  for (const text of texts) {
    form.append("text", text);
  }

  try {
    const response = await fetch(config.deeplApiUrl, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${config.deeplApiKey}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    if (!response.ok) {
      console.error("DeepL translate failed", response.status, await response.text());
      return null;
    }

    const data = await response.json() as {
      translations?: Array<{ text?: string }>;
    };

    const translated = data.translations?.map((item) => item.text ?? "") ?? [];
    return translated.length === texts.length ? translated : null;
  } catch (error) {
    console.error("DeepL translate exception", error);
    return null;
  }
}

async function translateWithAzure(texts: string[], language: SupportedLanguage): Promise<string[] | null> {
  if (texts.length === 0 || language === "cs") {
    return texts;
  }

  const key = config.azureTranslatorKey;
  if (!key) {
    return null;
  }

  try {
    const response = await fetch(`https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=cs&to=${language}`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(texts.map(text => ({ text }))),
    });

    if (!response.ok) {
      console.error("Azure failed", response.status, await response.text());
      return null;
    }

    const data = await response.json() as Array<{ translations?: Array<{ text?: string }> }>;
    const translated = data.map(item => item.translations?.[0]?.text || "");

    if (translated.length === texts.length && translated.every((text) => text)) {
      return translated;
    }

    console.error("Azure returned invalid data", data);
    return null;
  } catch (error) {
    console.error("Azure exception", error);
    return null;
  }
}

async function translateWithMyMemory(texts: string[], language: SupportedLanguage): Promise<string[] | null> {
  if (texts.length === 0 || language === "cs") {
    return texts;
  }

  try {
    const translated = await Promise.all(texts.map(async (text) => {
      const url = new URL("https://api.mymemory.translated.net/get");
      url.searchParams.set("q", text);
      url.searchParams.set("langpair", `cs|${language}`);

      const response = await fetch(url);
      if (!response.ok) {
        console.error("MyMemory failed", response.status, await response.text());
        return null;
      }

      const data = await response.json() as { responseData?: { translatedText?: string } };
      return data.responseData?.translatedText || text;
    }));

    return translated.filter((text): text is string => text !== null);
  } catch (error) {
    console.error("MyMemory exception", error);
    return null;
  }
}

async function translateWithLibreTranslate(texts: string[], language: SupportedLanguage): Promise<string[] | null> {
  if (texts.length === 0 || language === "cs") {
    return texts;
  }

  try {
    const response = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: texts,
        source: "cs",
        target: language,
      }),
    });

    if (!response.ok) {
      console.error("LibreTranslate failed", response.status, await response.text());
      return null;
    }

    const data = await response.json() as { translatedText?: string[] };
    const translated = data.translatedText;

    if (translated?.length === texts.length) {
      return translated;
    }

    console.error("LibreTranslate returned invalid data", data);
    return null;
  } catch (error) {
    console.error("LibreTranslate exception", error);
    return null;
  }
}

async function translateWithReverso(texts: string[], language: SupportedLanguage): Promise<string[] | null> {
  if (texts.length === 0 || language === "cs") {
    return texts;
  }

  try {
    const translated = await Promise.all(texts.map(async (text) => {
      const response = await fetch("https://api.reverso.net/translate/v1/translation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: text,
          from: "cs",
          to: language,
          format: "text",
        }),
      });

      if (!response.ok) {
        console.error("Reverso failed", response.status, await response.text());
        return null;
      }

      const data = await response.json() as { translation?: string[] };
      const trans = data.translation?.[0];
      return trans || text;
    }));

    return translated.filter((text): text is string => text !== null);
  } catch (error) {
    console.error("Reverso exception", error);
    return null;
  }
}

async function translateWithGoogle(texts: string[], language: SupportedLanguage): Promise<string[] | null> {
  if (texts.length === 0 || language === "cs") {
    return texts;
  }

  try {
    const translated = await Promise.all(texts.map(async (text) => {
      const url = new URL("https://translate.googleapis.com/translate_a/single");
      url.searchParams.set("client", "gtx");
      url.searchParams.set("sl", "cs");
      url.searchParams.set("tl", language);
      url.searchParams.set("dt", "t");
      url.searchParams.set("q", text);

      const response = await fetch(url);
      if (!response.ok) {
        console.error("Google translate failed", response.status, await response.text());
        return null;
      }

      const payload = await response.json() as unknown[];
      const first = Array.isArray(payload[0]) ? payload[0] as unknown[] : [];
      const sentence = first
        .map((entry) => Array.isArray(entry) ? entry[0] : "")
        .join("")
        .trim();

      return sentence || text;
    }));

    return translated.filter((text): text is string => text !== null);
  } catch (error) {
    console.error("Google translate exception", error);
    return null;
  }
}

export async function translateBatch(
  texts: string[],
  language: SupportedLanguage,
  fallback: (text: string) => string | null,
): Promise<TranslateMap> {
  const uniqueTexts = Array.from(new Set(texts.map((text) => text.trim()).filter(Boolean)));
  const result: TranslateMap = new Map();
  const fallbackMap = new Map<string, string | null>();
  const machineTexts: string[] = [];

  if (language === "cs") {
    for (const text of uniqueTexts) {
      result.set(text, text);
    }
    return result;
  }

  for (const text of uniqueTexts) {
    const cacheKey = `${language}:${text}`;
    const cached = translationCache.get(cacheKey);

    if (cached) {
      result.set(text, cached);
      continue;
    }

    const fallbackValue = fallback(text);
    fallbackMap.set(text, fallbackValue);

    if (fallbackValue) {
      result.set(text, fallbackValue);
      translationCache.set(cacheKey, fallbackValue);
    } else {
      machineTexts.push(text);
    }
  }

  const deepL = machineTexts.length > 0 ? await translateWithDeepL(machineTexts, language) : [];
  const translated = deepL ?? await translateWithAzure(machineTexts, language) ?? await translateWithMyMemory(machineTexts, language) ?? await translateWithGoogle(machineTexts, language);

  if (translated) {
    machineTexts.forEach((text, index) => {
      const value = translated[index] ?? fallbackMap.get(text) ?? text;
      result.set(text, value);
      translationCache.set(`${language}:${text}`, value);
    });
  }

  for (const text of machineTexts) {
    if (!result.has(text)) {
      const value = fallbackMap.get(text) ?? text;
      result.set(text, value);
      translationCache.set(`${language}:${text}`, value);
    }
  }

  return result;
}
