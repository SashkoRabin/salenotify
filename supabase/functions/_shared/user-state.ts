import { db } from "./db.ts";
import {
  inferSupportedLanguage,
  normalizeSupportedLanguage,
  type SupportedLanguage,
} from "./i18n.ts";

export type UserRecord = {
  id: string;
  onboarding_step: string | null;
  notifications_enabled: boolean;
  language_code: string | null;
};

export type SubscriptionSnapshot = {
  subscriptionId: string | null;
  cityName: string | null;
  chainNames: string[];
  chainCodes: string[];
};

type ChainRow = {
  id: string;
  code?: string;
};

type SubscriptionRow = {
  id: string;
  cities?: {
    name?: string;
  } | null;
  subscription_chains?: Array<{
    chains?: {
      code?: string;
      name?: string;
    } | null;
  }> | null;
};

type EnsureUserProfileParams = {
  telegramUserId: number;
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  telegramLanguageCode?: string;
};

export async function getUserRecord(telegramUserId: number): Promise<UserRecord> {
  const { data, error } = await db
    .from("users")
    .select("id, onboarding_step, notifications_enabled, language_code")
    .eq("telegram_user_id", telegramUserId)
    .single();

  if (error) {
    throw error;
  }

  return data as unknown as UserRecord;
}

export function getUserLanguage(
  user: { language_code?: string | null },
  telegramLanguageCode?: string | null,
): SupportedLanguage {
  return normalizeSupportedLanguage(user.language_code) ?? inferSupportedLanguage(telegramLanguageCode);
}

export async function ensureUserProfile(params: EnsureUserProfileParams) {
  const { data: existingUser } = await db
    .from("users")
    .select("id, language_code")
    .eq("telegram_user_id", params.telegramUserId)
    .maybeSingle();

  const resolvedLanguage = normalizeSupportedLanguage(existingUser?.language_code)
    ?? inferSupportedLanguage(params.telegramLanguageCode);

  if (existingUser) {
    const { error } = await db
      .from("users")
      .update({
        telegram_chat_id: params.chatId,
        username: params.username ?? null,
        first_name: params.firstName ?? null,
        last_name: params.lastName ?? null,
        language_code: resolvedLanguage,
        updated_at: new Date().toISOString(),
      })
      .eq("telegram_user_id", params.telegramUserId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await db.from("users").insert({
    telegram_user_id: params.telegramUserId,
    telegram_chat_id: params.chatId,
    username: params.username ?? null,
    first_name: params.firstName ?? null,
    last_name: params.lastName ?? null,
    language_code: resolvedLanguage,
    notifications_enabled: true,
    onboarding_step: "awaiting_language",
  });

  if (error) {
    throw error;
  }
}

export async function setOnboardingStep(telegramUserId: number, step: string) {
  const { error } = await db
    .from("users")
    .update({
      onboarding_step: step,
      updated_at: new Date().toISOString(),
    })
    .eq("telegram_user_id", telegramUserId);

  if (error) {
    throw error;
  }
}

export async function setUserLanguage(telegramUserId: number, language: SupportedLanguage) {
  const { error } = await db
    .from("users")
    .update({
      language_code: language,
      updated_at: new Date().toISOString(),
    })
    .eq("telegram_user_id", telegramUserId);

  if (error) {
    throw error;
  }
}

export async function setNotificationsEnabled(telegramUserId: number, enabled: boolean) {
  const { error } = await db
    .from("users")
    .update({
      notifications_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("telegram_user_id", telegramUserId);

  if (error) {
    throw error;
  }
}

export async function upsertSubscription(userId: string, citySlug: string) {
  const { data: city, error: cityError } = await db
    .from("cities")
    .select("id, name")
    .eq("slug", citySlug)
    .single();

  if (cityError) {
    throw cityError;
  }

  const { data: existingSubscriptions, error: subscriptionFetchError } = await db
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId);

  if (subscriptionFetchError) {
    throw subscriptionFetchError;
  }

  if ((existingSubscriptions ?? []).length > 0) {
    const { error: disableError } = await db
      .from("subscriptions")
      .update({
        enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (disableError) {
      throw disableError;
    }
  }

  const { data: subscription, error: upsertError } = await db
    .from("subscriptions")
    .upsert({
      user_id: userId,
      city_id: city.id,
      enabled: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id,city_id",
    })
    .select("id")
    .single();

  if (upsertError) {
    throw upsertError;
  }

  return {
    subscriptionId: subscription.id,
    cityName: city.name,
  };
}

export async function saveSubscriptionChains(subscriptionId: string, chainCodes: string[]) {
  const { data: chainRows, error: chainFetchError } = await db
    .from("chains")
    .select("id, code")
    .in("code", chainCodes);

  if (chainFetchError) {
    throw chainFetchError;
  }

  const { error: deleteError } = await db
    .from("subscription_chains")
    .delete()
    .eq("subscription_id", subscriptionId);

  if (deleteError) {
    throw deleteError;
  }

  const chains = (chainRows ?? []) as unknown as ChainRow[];
  if (chains.length === 0) {
    return;
  }

  const { error: insertError } = await db
    .from("subscription_chains")
    .insert(chains.map((chain) => ({
      subscription_id: subscriptionId,
      chain_id: chain.id,
    })));

  if (insertError) {
    throw insertError;
  }
}

export async function getActiveSubscriptionSnapshot(userId: string): Promise<SubscriptionSnapshot> {
  const { data: subscription, error } = await db
    .from("subscriptions")
    .select(`
      id,
      cities!inner(name),
      subscription_chains(
        chains!inner(code, name)
      )
    `)
    .eq("user_id", userId)
    .eq("enabled", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const activeSubscription = subscription as unknown as SubscriptionRow | null;
  const chainNames = (activeSubscription?.subscription_chains ?? [])
    .map((item) => item.chains?.name)
    .filter((value: string | undefined): value is string => Boolean(value));
  const chainCodes = (activeSubscription?.subscription_chains ?? [])
    .map((item) => item.chains?.code)
    .filter((value: string | undefined): value is string => Boolean(value));

  return {
    subscriptionId: activeSubscription?.id ?? null,
    cityName: activeSubscription?.cities?.name ?? null,
    chainNames,
    chainCodes,
  };
}
