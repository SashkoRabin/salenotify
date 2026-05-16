export const SUPPORTED_LANGUAGE_CODES = ["ru", "uk", "cs", "en"] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGE_CODES[number];

type TranslationKey =
  | "language_name"
  | "brand"
  | "welcome_intro"
  | "subscription_enabled"
  | "choose_city_and_chains"
  | "write_city_example"
  | "choose_language"
  | "language_saved"
  | "choose_city"
  | "type_city"
  | "city_saved"
  | "choose_chains"
  | "chains_available"
  | "send_multiple_chains"
  | "digest_ready"
  | "city_label"
  | "meat"
  | "chains_label"
  | "language_label"
  | "first_digest_below"
  | "daily_at_nine"
  | "quick_actions"
  | "notifications_paused"
  | "notifications_paused_hint"
  | "notifications_resumed"
  | "notifications_resumed_hint"
  | "status_active"
  | "status_paused"
  | "status_title"
  | "settings_title"
  | "not_selected"
  | "manual_today"
  | "no_fresh_offers"
  | "all_chains"
  | "today_button"
  | "status_button"
  | "settings_button"
  | "city_button"
  | "chains_button"
  | "more_button"
  | "categories_button"
  | "pause_button"
  | "resume_button"
  | "back_button"
  | "language_button"
  | "first_choose_city_and_chains"
  | "choose_store"
  | "cannot_recognize_store"
  | "store_not_in_selection"
  | "no_detailed_offers"
  | "store_detail_header"
  | "first_choose_city"
  | "cannot_recognize_city"
  | "city_suggestions"
  | "send_one_variant"
  | "city_try_examples"
  | "cannot_recognize_chains"
  | "preferences_categories"
  | "preferences_categories_description"
  | "preferences_categories_saved"
  | "preferences_categories_toggle_hint"
  | "selected_categories"
  | "category_added"
  | "category_removed"
  | "preferences_categories_error"
  | "done_button"
  | "no_categories_selected"
  | "supported_commands"
  | "leaflet_default"
  | "networks_label"
  | "valid_until_today"
  | "valid_for_days_1"
  | "valid_for_days_2_4"
  | "valid_for_days_5_plus"
  | "digest_valid_compact_today"
  | "digest_stats"
  | "digest_valid_compact_days_1"
  | "digest_valid_compact_days_2_4"
  | "digest_valid_compact_days_5_plus"
  | "use_buttons_below";

const translations: Record<SupportedLanguage, Record<TranslationKey, string>> = {
  ru: {
    language_name: "Русский",
    brand: "SaleNotify CZ",
    welcome_intro: "Ежедневно собираю скидки и свежие акции по супермаркетам Чехии.",
    subscription_enabled: "Подписка уже включена.",
    choose_city_and_chains: "Осталось выбрать язык, город и сети.",
    write_city_example: "Напишите город, например: {examples}.",
    choose_language: "Выберите язык",
    language_saved: "Язык сохранен: {language}",
    choose_city: "Выберите город Чехии",
    type_city: "Введите его сообщением. Например: {examples}.",
    city_saved: "Город сохранен: {city}",
    choose_chains: "Теперь выберите сети.",
    chains_available: "Сейчас доступны: {chains}.",
    send_multiple_chains: "Можно отправить несколько названий через запятую или выбрать «{allChains}».",
    digest_ready: "Подписка настроена",
    city_label: "Город",
    chains_label: "Сети",
    language_label: "Язык",
    preferences_categories: "🧩 Предпочитаемые категории",
    preferences_categories_description: "Выберите категории товаров, которые вас больше всего интересуют. Они будут показываться в приоритете.",
    preferences_categories_saved: "Предпочтения по категориям сохранены.",
    preferences_categories_toggle_hint: "Нажмите на категорию, чтобы добавить или удалить её из избранного.",
    selected_categories: "Выбранные категории:",
    category_added: "{category} добавлена в избранное.",
    category_removed: "{category} удалена из избранного.",
    preferences_categories_error: "Ошибка при изменении категорий. Попробуйте еще раз.",
    done_button: "Готово",
    no_categories_selected: "Не выбрано",
    first_digest_below: "Первая сводка уже ниже.",
    daily_at_nine: "Дальше она будет приходить каждый день в 09:00 по чешскому времени.",
    quick_actions: "Быстрые действия",
    notifications_paused: "Уведомления приостановлены",
    notifications_paused_hint: "Настройки сохранены. Вернуть рассылку можно командой /resume.",
    notifications_resumed: "Уведомления снова активны",
    notifications_resumed_hint: "Ежедневная сводка вернулась в обычный режим.",
    status_active: "активен",
    status_paused: "на паузе",
    status_title: "Текущий статус",
    settings_title: "Настройки",
    not_selected: "не выбран",
    manual_today: "Ручной просмотр: /today.",
    no_fresh_offers: "Сегодня свежих позиций пока нет. Следующая сводка придет автоматически.",
    all_chains: "Все сети",
    meat: "Мясо",
    today_button: "📊 Сегодня",
    status_button: "Статус",
    settings_button: "⚙️ Настройки",
    city_button: "📍 Город",
    chains_button: "🛒 Сети",
    more_button: "🔥 Журналы скидок",
    categories_button: "🧩 Категории",
    pause_button: "⏸ Пауза",
    resume_button: "▶️ Возобновить",
    back_button: "🔙 Назад",
    language_button: "🌐 Язык",
    first_choose_city_and_chains: "Сначала выберите город и сети. Начните с /city.",
    choose_store: "Выберите магазин, и я покажу расширенную сводку по нему.",
    cannot_recognize_store: "Не смог распознать магазин. Доступно: Kaufland · PENNY · Albert · Lidl · BILLA.",
    store_not_in_selection: "Магазин {store} сейчас не входит в вашу подборку. Добавьте его через /chains.",
    no_detailed_offers: "Пока не вижу подробных акций для {store}. Попробуйте позже.",
    store_detail_header: "{store} • подробная сводка\nПоказываю до 20 товаров с текущими акциями.",
    first_choose_city: "Сначала выберите город через /city или просто отправьте его названием.",
    cannot_recognize_city: "Не смог точно распознать город.",
    city_suggestions: "Возможно, вы имели в виду: {cities}.",
    send_one_variant: "Отправьте один из вариантов сообщением.",
    city_try_examples: "Попробуйте один из вариантов: {cities}.",
    cannot_recognize_chains: "Не смог распознать сети. Отправьте, например: Kaufland, Lidl или Все сети.",
    supported_commands: "Поддерживаются /start, /today, /store <магазин>, /status, /settings. Можно просто написать город, чтобы начать.",
    leaflet_default: "Летак {chain}",
    networks_label: "Сети",
    valid_until_today: "еще сегодня",
    valid_for_days_1: "еще {count} день",
    valid_for_days_2_4: "еще {count} дня",
    valid_for_days_5_plus: "еще {count} дней",
    digest_valid_compact_today: "сегодня",
    digest_stats: "📊 Сегодня найдено: {count} скидки 🔥 Лучшая: -{percent}% на {title}",
    digest_valid_compact_days_1: "{count} день",
    digest_valid_compact_days_2_4: "{count} дня",
    digest_valid_compact_days_5_plus: "{count} дней",
    use_buttons_below: "Используйте кнопки ниже для изменения настроек.",
  },
  uk: {
    language_name: "Українська",
    brand: "SaleNotify CZ",
    welcome_intro: "Щодня збираю знижки та свіжі акції супермаркетів Чехії.",
    subscription_enabled: "Підписку вже увімкнено.",
    choose_city_and_chains: "Залишилось вибрати мову, місто та мережі.",
    write_city_example: "Напишіть місто, наприклад: {examples}.",
    choose_language: "Оберіть мову",
    language_saved: "Мову збережено: {language}",
    choose_city: "Оберіть місто Чехії",
    type_city: "Введіть його повідомленням. Наприклад: {examples}.",
    city_saved: "Місто збережено: {city}",
    choose_chains: "Тепер оберіть мережі.",
    chains_available: "Зараз доступні: {chains}.",
    send_multiple_chains: "Можна надіслати кілька назв через кому або вибрати «{allChains}».",
    digest_ready: "Підписку налаштовано",
    city_label: "Місто",
    chains_label: "Мережі",
    meat: "М'ясо",
    language_label: "Мова",
    preferences_categories: "🧩 Вподобані категорії",
    preferences_categories_description: "Виберіть категорії товарів, які вас найбільше цікавлять. Вони будуть відображатися в пріоритеті.",
    preferences_categories_saved: "Уподобання за категоріями збережені.",
    preferences_categories_toggle_hint: "Натисніть на категорію, щоб додати або видалити її з вибраного.",
    selected_categories: "Обрані категорії:",
    category_added: "{category} додано у вибране.",
    category_removed: "{category} видалено з вибраного.",
    preferences_categories_error: "Помилка при зміні категорій. Спробуйте ще раз.",
    done_button: "Готово",
    no_categories_selected: "Не вибрано",
    first_digest_below: "Перше зведення вже нижче.",
    daily_at_nine: "Далі воно приходитиме щодня о 09:00 за чеським часом.",
    quick_actions: "Швидкі дії",
    notifications_paused: "Сповіщення призупинено",
    notifications_paused_hint: "Налаштування збережено. Повернути розсилку можна командою /resume.",
    notifications_resumed: "Сповіщення знову активні",
    notifications_resumed_hint: "Щоденне зведення повернулося у звичайний режим.",
    status_active: "активний",
    status_paused: "на паузі",
    status_title: "Поточний статус",
    settings_title: "Налаштування",
    not_selected: "не вибрано",
    manual_today: "Ручний перегляд: /today.",
    no_fresh_offers: "Сьогодні свіжих позицій поки немає. Наступне зведення прийде автоматично.",
    all_chains: "Усі мережі",
    today_button: "📊 Сьогодні",
    status_button: "Статус",
    settings_button: "⚙️ Налаштування",
    city_button: "📍 Місто",
    chains_button: "🛒 Мережі",
    more_button: "🔥 Журнали знижок",
    categories_button: "🧩 Категорії",
    pause_button: "⏸ Пауза",
    resume_button: "▶️ Відновити",
    back_button: "🔙 Назад",
    language_button: "🌐 Мова",
    first_choose_city_and_chains: "Спочатку виберіть місто й мережі. Почніть із /city.",
    choose_store: "Оберіть магазин, і я покажу розширене зведення по ньому.",
    cannot_recognize_store: "Не вдалося розпізнати магазин. Доступно: Kaufland · PENNY · Albert · Lidl · BILLA.",
    store_not_in_selection: "Магазин {store} зараз не входить у вашу добірку. Додайте його через /chains.",
    no_detailed_offers: "Поки не бачу детальних акцій для {store}. Спробуйте пізніше.",
    store_detail_header: "{store} • детальне зведення\nПоказую до 20 товарів з актуальними акціями.",
    first_choose_city: "Спочатку виберіть місто через /city або просто надішліть його назву.",
    cannot_recognize_city: "Не вдалося точно розпізнати місто.",
    city_suggestions: "Можливо, ви мали на увазі: {cities}.",
    send_one_variant: "Надішліть один із варіантів повідомленням.",
    city_try_examples: "Спробуйте один із варіантів: {cities}.",
    cannot_recognize_chains: "Не вдалося розпізнати мережі. Надішліть, наприклад: Kaufland, Lidl або Усі мережі.",
    supported_commands: "Підтримуються /start, /today, /store <магазин>, /status, /settings. Можна просто написати місто, щоб почати.",
    leaflet_default: "Листівка {chain}",
    networks_label: "Мережі",
    valid_until_today: "ще сьогодні",
    valid_for_days_1: "ще {count} день",
    valid_for_days_2_4: "ще {count} дні",
    valid_for_days_5_plus: "ще {count} днів",
    digest_valid_compact_today: "сьогодні",
    digest_stats: "📊 Сьогодні знайдено: {count} знижки 🔥 Найкраща: -{percent}% на {title}",
    digest_valid_compact_days_1: "{count} день",
    digest_valid_compact_days_2_4: "{count} дні",
    digest_valid_compact_days_5_plus: "{count} днів",
    use_buttons_below: "Використовуйте кнопки нижче для зміни налаштувань.",
  },
  cs: {
    language_name: "Čeština",
    brand: "SaleNotify CZ",
    welcome_intro: "Každý den sbírám slevy a čerstvé akce českých supermarketů.",
    subscription_enabled: "Odběr je už zapnutý.",
    choose_city_and_chains: "Zbývá vybrat jazyk, město a řetězce.",
    write_city_example: "Napište město, například: {examples}.",
    choose_language: "Vyberte jazyk",
    language_saved: "Jazyk uložen: {language}",
    choose_city: "Vyberte město v Česku",
    type_city: "Pošlete ho zprávou. Například: {examples}.",
    city_saved: "Město uloženo: {city}",
    choose_chains: "Teď vyberte řetězce.",
    chains_available: "Aktuálně dostupné: {chains}.",
    send_multiple_chains: "Můžete poslat více názvů oddělených čárkou nebo vybrat „{allChains}“.",
    digest_ready: "Odběr je nastaven",
    city_label: "Město",
    meat: "Maso",
    preferences_categories: "🧩 Preferované kategorie",
    preferences_categories_description: "Vyberte kategorie produktů, které vás nejvíce zajímají. Budou zobrazeny jako první.",
    preferences_categories_saved: "Předvolby kategorií uloženy.",
    preferences_categories_toggle_hint: "Klikněte na kategorii pro přidání nebo odebrání z oblíbených.",
    selected_categories: "Vybrané kategorie:",
    category_added: "{category} bylo přidáno do oblíbených.",
    category_removed: "{category} bylo odebráno z oblíbených.",
    preferences_categories_error: "Chyba při změně kategorií. Zkuste to prosím znovu.",
    done_button: "Hotovo",
    no_categories_selected: "Nevybráno",
    chains_label: "Řetězce",
    language_label: "Jazyk",
    first_digest_below: "První přehled je hned níže.",
    daily_at_nine: "Další bude chodit každý den v 09:00 podle českého času.",
    quick_actions: "Rychlé akce",
    notifications_paused: "Upozornění jsou pozastavena",
    notifications_paused_hint: "Nastavení zůstalo zachováno. Obnovit je můžete příkazem /resume.",
    notifications_resumed: "Upozornění jsou znovu aktivní",
    notifications_resumed_hint: "Denní přehled se vrátil do běžného režimu.",
    status_active: "aktivní",
    status_paused: "pozastaveno",
    status_title: "Aktuální stav",
    settings_title: "Nastavení",
    not_selected: "není vybráno",
    manual_today: "Ruční přehled: /today.",
    no_fresh_offers: "Dnes zatím nejsou nové položky. Další přehled přijde automaticky.",
    all_chains: "Všechny řetězce",
    today_button: "📊 Dnes",
    status_button: "Stav",
    settings_button: "⚙️ Nastavení",
    city_button: "📍 Město",
    chains_button: "🛒 Řetězce",
    more_button: "🔥 Podrobněji",
    categories_button: "🧩 Kategorie",
    pause_button: "⏸ Pauza",
    resume_button: "▶️ Obnovit",
    back_button: "🔙 Zpět",
    language_button: "🌐 Jazyk",
    first_choose_city_and_chains: "Nejprve vyberte město a řetězce. Začněte přes /city.",
    choose_store: "Vyberte obchod a ukážu vám rozšířený přehled.",
    cannot_recognize_store: "Nepodařilo se rozpoznat obchod. Dostupné: Kaufland · PENNY · Albert · Lidl · BILLA.",
    store_not_in_selection: "Obchod {store} teď není ve vašem výběru. Přidejte ho přes /chains.",
    no_detailed_offers: "Podrobné akce pro {store} teď nejsou k dispozici. Zkuste to později.",
    store_detail_header: "{store} • podrobný přehled\nUkazuji až 20 aktuálních akčních položek.",
    first_choose_city: "Nejprve vyberte město přes /city nebo ho pošlete rovnou zprávou.",
    cannot_recognize_city: "Nepodařilo se přesně rozpoznat město.",
    city_suggestions: "Možná jste mysleli: {cities}.",
    send_one_variant: "Pošlete jednu z možností zprávou.",
    city_try_examples: "Zkuste jednu z možností: {cities}.",
    cannot_recognize_chains: "Nepodařilo se rozpoznat řetězce. Pošlete například: Kaufland, Lidl nebo Všechny řetězce.",
    supported_commands: "Podporuji /start, /today, /store <obchod>, /status, /settings. Můžete také jen napsat město a začít.",
    leaflet_default: "Leták {chain}",
    networks_label: "Řetězce",
    valid_until_today: "už jen dnes",
    valid_for_days_1: "ještě {count} den",
    valid_for_days_2_4: "ještě {count} dny",
    valid_for_days_5_plus: "ještě {count} dní",
    digest_valid_compact_today: "dnes",
    digest_stats: "📊 Dnes nalezeno: {count} slev 🔥 Nejlepší: -{percent}% na {title}",
    digest_valid_compact_days_1: "{count} den",
    digest_valid_compact_days_2_4: "{count} dny",
    digest_valid_compact_days_5_plus: "{count} dní",
    use_buttons_below: "Použijte tlačítka níže pro změnu nastavení.",
  },
  en: {
    language_name: "English",
    brand: "SaleNotify CZ",
    welcome_intro: "I collect supermarket discounts and fresh weekly deals across Czechia every day.",
    subscription_enabled: "Your subscription is already active.",
    choose_city_and_chains: "All that is left is to choose a language, city, and chains.",
    write_city_example: "Type a city, for example: {examples}.",
    choose_language: "Choose language",
    language_saved: "Language saved: {language}",
    choose_city: "Choose a Czech city",
    type_city: "Send it as a message. For example: {examples}.",
    city_saved: "City saved: {city}",
    choose_chains: "Now choose the chains.",
    chains_available: "Currently available: {chains}.",
    send_multiple_chains: "You can send several names separated by commas or choose “{allChains}”.",
    digest_ready: "Subscription is ready",
    city_label: "City",
    meat: "Meat",
    preferences_categories: "🧩 Preferred categories",
    preferences_categories_description: "Select the product categories that interest you most. They will be shown first.",
    preferences_categories_saved: "Preferred categories saved.",
    preferences_categories_toggle_hint: "Tap a category to add or remove it from favorites.",
    selected_categories: "Selected categories:",
    category_added: "{category} added to favorites.",
    category_removed: "{category} removed from favorites.",
    preferences_categories_error: "Error updating categories. Please try again.",
    done_button: "Done",
    no_categories_selected: "No categories selected.",
    chains_label: "Chains",
    language_label: "Language",
    first_digest_below: "Your first digest is right below.",
    daily_at_nine: "After that it will arrive every day at 09:00 Czech time.",
    quick_actions: "Quick actions",
    notifications_paused: "Notifications are paused",
    notifications_paused_hint: "Your settings are saved. Use /resume to turn the digest back on.",
    notifications_resumed: "Notifications are active again",
    notifications_resumed_hint: "The daily digest is back to normal.",
    status_active: "active",
    status_paused: "paused",
    status_title: "Current status",
    settings_title: "Settings",
    not_selected: "not selected",
    manual_today: "Manual view: /today.",
    no_fresh_offers: "No fresh items yet today. The next digest will arrive automatically.",
    all_chains: "All chains",
    today_button: "📊 Today",
    status_button: "Status",
    settings_button: "⚙️ Settings",
    city_button: "📍 City",
    chains_button: "🛒 Chains",
    more_button: "🔥 More",
    categories_button: "🧩 Categories",
    pause_button: "⏸ Pause",
    resume_button: "▶️ Resume",
    back_button: "🔙 Back",
    language_button: "🌐 Language",
    first_choose_city_and_chains: "Choose a city and chains first. Start with /city.",
    choose_store: "Choose a store and I will show a more detailed digest for it.",
    cannot_recognize_store: "I could not recognize the store. Available: Kaufland · PENNY · Albert · Lidl · BILLA.",
    store_not_in_selection: "The store {store} is not in your current selection. Add it with /chains.",
    no_detailed_offers: "I cannot see detailed offers for {store} yet. Please try again later.",
    store_detail_header: "{store} • detailed digest\nShowing up to 20 current discounted items.",
    first_choose_city: "Choose a city first with /city or just send its name.",
    cannot_recognize_city: "I could not confidently recognize the city.",
    city_suggestions: "You may have meant: {cities}.",
    send_one_variant: "Send one of the options as a message.",
    city_try_examples: "Try one of these: {cities}.",
    cannot_recognize_chains: "I could not recognize the chains. Send for example: Kaufland, Lidl or All chains.",
    supported_commands: "Supported: /start, /today, /store <store>, /status, /settings. You can also just type a city to begin.",
    leaflet_default: "{chain} leaflet",
    networks_label: "Chains",
    valid_until_today: "ends today",
    valid_for_days_1: "{count} day left",
    valid_for_days_2_4: "{count} days left",
    valid_for_days_5_plus: "{count} days left",
    digest_valid_compact_today: "today",
    digest_stats: "📊 Today found: {count} discounts 🔥 Best: -{percent}% on {title}",
    digest_valid_compact_days_1: "{count} day",
    digest_valid_compact_days_2_4: "{count} days",
    digest_valid_compact_days_5_plus: "{count} days",
    use_buttons_below: "Use the buttons below to change settings.",
  },
};

const BUTTON_KEYS = [
  "today_button",
  "status_button",
  "settings_button",
  "city_button",
  "chains_button",
  "more_button",
  "categories_button",
  "preferences_categories",
  "pause_button",
  "resume_button",
  "back_button",
  "language_button",
] as const;

type ButtonKey = typeof BUTTON_KEYS[number];

const buttonCommandMap: Record<ButtonKey, string> = {
  today_button: "/today",
  status_button: "/status",
  settings_button: "/settings",
  city_button: "/city",
  chains_button: "/chains",
  more_button: "/more",
  categories_button: "/categories",
  preferences_categories: "/preferences",
  pause_button: "/pause",
  resume_button: "/resume",
  back_button: "/back",
  language_button: "/language",
};

function format(template: string, params?: Record<string, string | number | null | undefined>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params?.[key] ?? ""));
}

export function normalizeCommandText(input?: string | null) {
  return (input ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSupportedLanguage(input?: string | null): SupportedLanguage | null {
  const value = (input ?? "").trim().toLowerCase();

  if (!value) return null;
  if (SUPPORTED_LANGUAGE_CODES.includes(value as SupportedLanguage)) {
    return value as SupportedLanguage;
  }

  const matched = SUPPORTED_LANGUAGE_CODES.find((code) =>
    translations[code].language_name.toLowerCase() === value
  );

  return matched ?? null;
}

export function inferSupportedLanguage(input?: string | null): SupportedLanguage {
  const normalized = (input ?? "").toLowerCase();

  if (normalized.startsWith("uk")) return "uk";
  if (normalized.startsWith("cs") || normalized.startsWith("cz")) return "cs";
  if (normalized.startsWith("en")) return "en";
  return "ru";
}

export function t(
  language: SupportedLanguage,
  key: TranslationKey,
  params?: Record<string, string | number | null | undefined>,
) {
  return format(translations[language][key], params);
}

export function getLanguageName(language: SupportedLanguage) {
  return t(language, "language_name");
}

export function getLanguageOptions() {
  return SUPPORTED_LANGUAGE_CODES.map((code) => ({
    code,
    label: translations[code].language_name,
  }));
}

export function mapLocalizedCommand(input?: string | null) {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  if (raw.startsWith("/")) {
    return raw.toLowerCase();
  }

  const normalized = normalizeCommandText(raw);

  for (const language of SUPPORTED_LANGUAGE_CODES) {
    for (const key of BUTTON_KEYS) {
      const buttonText = normalizeCommandText(translations[language][key]);
      if (buttonText === normalized) {
        return buttonCommandMap[key];
      }
    }
  }

  return raw || null;
}

export function formatRemainingDays(language: SupportedLanguage, days: number) {
  if (days <= 1) {
    return t(language, "valid_until_today");
  }

  const remainder = days % 10;
  const remainderHundred = days % 100;

  if ((language === "ru" || language === "uk") && remainder >= 2 && remainder <= 4 && !(remainderHundred >= 12 && remainderHundred <= 14)) {
    return t(language, "valid_for_days_2_4", { count: days });
  }

  if ((language === "ru" || language === "uk") && remainder === 1 && remainderHundred !== 11) {
    return t(language, "valid_for_days_1", { count: days });
  }

  return t(language, "valid_for_days_5_plus", { count: days });
}

/** Short validity for digest cards (no «ще / ještě» prefix). */
export function formatDigestRemainingCompact(language: SupportedLanguage, days: number) {
  if (days <= 1) {
    return t(language, "digest_valid_compact_today");
  }

  const remainder = days % 10;
  const remainderHundred = days % 100;

  if (language === "cs") {
    if (remainder === 1 && remainderHundred !== 11) {
      return t(language, "digest_valid_compact_days_1", { count: days });
    }
    if (remainder >= 2 && remainder <= 4 && !(remainderHundred >= 12 && remainderHundred <= 14)) {
      return t(language, "digest_valid_compact_days_2_4", { count: days });
    }
    return t(language, "digest_valid_compact_days_5_plus", { count: days });
  }

  if ((language === "ru" || language === "uk") && remainder >= 2 && remainder <= 4 && !(remainderHundred >= 12 && remainderHundred <= 14)) {
    return t(language, "digest_valid_compact_days_2_4", { count: days });
  }

  if ((language === "ru" || language === "uk") && remainder === 1 && remainderHundred !== 11) {
    return t(language, "digest_valid_compact_days_1", { count: days });
  }

  return t(language, "digest_valid_compact_days_5_plus", { count: days });
}
