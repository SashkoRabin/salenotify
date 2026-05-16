import { buildDigestMessage, refreshDigestSources, shouldRunDailyDigest } from "../_shared/digest.ts";
import { db } from "../_shared/db.ts";
import { getUserCategoryPreferences } from "../_shared/categories.ts";
import { inferSupportedLanguage, normalizeSupportedLanguage } from "../_shared/i18n.ts";
import { sendTelegramMessageChunks } from "../_shared/telegram.ts";

declare const Deno: {
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

type SubscriptionChainRow = {
  chains?: {
    code?: string;
    name?: string;
  } | null;
};

type DigestSubscriptionRow = {
  id: string;
  users: {
    id: string;
    telegram_chat_id: number;
    notifications_enabled: boolean;
    language_code: string | null;
  };
  cities?: {
    name?: string;
  } | null;
  subscription_chains?: SubscriptionChainRow[] | null;
};

function selectedChainCodes(subscription: DigestSubscriptionRow) {
  return (subscription.subscription_chains ?? [])
    .map((item) => item.chains?.code)
    .filter((code): code is string => Boolean(code));
}

function selectedChainNames(subscription: DigestSubscriptionRow) {
  return (subscription.subscription_chains ?? [])
    .map((item) => item.chains?.name)
    .filter((name): name is string => Boolean(name));
}

Deno.serve(async (request: Request) => {
  try {
    const body = await request.json().catch(() => ({}));
    const trigger = typeof body?.trigger === "string" ? body.trigger : null;

    if (trigger === "cron" && !shouldRunDailyDigest()) {
      return new Response(JSON.stringify({
        ok: true,
        skipped: true,
        reason: "outside_prague_0900_window",
      }), {
        headers: {
          "content-type": "application/json",
        },
      });
    }

    const { data: subscriptions, error } = await db
      .from("subscriptions")
      .select(`
        id,
        users!inner(id, telegram_chat_id, notifications_enabled, language_code),
        cities!inner(name),
        subscription_chains(
          chains!inner(code, name)
        )
      `)
      .eq("enabled", true)
      .eq("users.notifications_enabled", true);

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    const subscriptionRows = (subscriptions ?? []) as unknown as DigestSubscriptionRow[];
    const allChainCodes = Array.from(new Set(subscriptionRows.flatMap(selectedChainCodes)));

    await refreshDigestSources(allChainCodes);

    for (const subscription of subscriptionRows) {
      const cityName = subscription.cities?.name ?? "Unknown city";
      const selectedChains = selectedChainNames(subscription);
      const selectedCodes = selectedChainCodes(subscription);
      const language = normalizeSupportedLanguage(subscription.users.language_code)
        ?? inferSupportedLanguage(subscription.users.language_code);
      
      const preferredCategoryKeys = await getUserCategoryPreferences(subscription.users.id);

      const text = await buildDigestMessage({
        cityName,
        selectedCodes,
        selectedChains,
        language,
        preferredCategoryKeys,
      });

      await sendTelegramMessageChunks(subscription.users.telegram_chat_id, text);
    }

    return new Response(JSON.stringify({
      ok: true,
      subscriptions: subscriptions?.length ?? 0,
    }), {
      headers: {
        "content-type": "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);

    return new Response(JSON.stringify({
      ok: false,
      error: message,
    }), {
      status: 500,
      headers: {
        "content-type": "application/json",
      },
    });
  }
});
