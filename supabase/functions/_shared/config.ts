export function requireEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function requireOneOfEnv(names: string[]): string {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing required environment variable. Tried: ${names.join(", ")}`);
}

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

export const config = {
  supabaseUrl: requireOneOfEnv(["APP_SUPABASE_URL", "SUPABASE_URL"]),
  supabaseServiceRoleKey: requireOneOfEnv([
    "APP_SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]),
  telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  telegramWebhookSecret: requireEnv("TELEGRAM_WEBHOOK_SECRET"),
  defaultTimezone: Deno.env.get("DEFAULT_TIMEZONE") ?? "Europe/Prague",
  // For reliable translation, set DEEPL_API_KEY or AZURE_TRANSLATOR_KEY in Supabase secrets
  deeplApiKey: Deno.env.get("DEEPL_API_KEY") ?? null,
  deeplApiUrl: Deno.env.get("DEEPL_API_URL") ?? "https://api-free.deepl.com/v2/translate",
  azureTranslatorKey: Deno.env.get("AZURE_TRANSLATOR_KEY") ?? null,
};
