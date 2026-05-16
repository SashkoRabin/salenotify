import { db } from "./db.ts";
import { t, type SupportedLanguage } from "./i18n.ts";

export type ProductCategoryKey =
  | "meat"
  | "dairy"
  | "eggs"
  | "cookies"
  | "drinks"
  | "vegetables"
  | "household"
  | "snacks";

type CategoryDefinition = {
  key: ProductCategoryKey;
  icon: string;
  labels: Record<SupportedLanguage, string>;
  aliases: string[];
  patterns: string[];
  strictPatterns?: string[];
  excludePatterns?: string[];
};

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    key: "meat",
    icon: "🥩",
    labels: { ru: "Мясо", uk: "М'ясо", cs: "Maso", en: "Meat" },
    aliases: ["meat", "maso", "мясо", "м'ясо"],
    patterns: ["maso", "kure", "kureci", "veprove", "hovezi", "kruti", "mlete", "meat", "мяс", "м'яс", "кур", "свин", "говяд", "індич", "uzeniny", "parek"],
  },
  {
    key: "dairy",
    icon: "🥛",
    labels: { ru: "Молочные", uk: "Молочні", cs: "Mléčné", en: "Dairy" },
    aliases: ["dairy", "mlecne", "молочные", "молочні"],
    patterns: ["mleko", "milk", "dairy", "jogurt", "yogurt", "cheese", "syr", "tvaroh", "kefir", "smetana", "maslo", "йогур", "молок", "сыр", "сир", "кеф", "сметан", "твор", "вершк", "activia", "actimel", "cottage"],
  },
  {
    key: "eggs",
    icon: "🥚",
    labels: { ru: "Яйца", uk: "Яйця", cs: "Vejce", en: "Eggs" },
    aliases: ["eggs", "egg", "vejce", "vajec", "яйца", "яйця"],
    patterns: ["vejce", "egg", "eggs", "яйца", "яйця"],
    strictPatterns: ["vejce", "egg", "eggs", "яйца", "яйця"],
    excludePatterns: ["vajecne", "testoviny", "nudle", "nitovky", "napoj", "jogurt", "veggie", "majoneza", "pasta", "polevka"],
  },
  {
    key: "cookies",
    icon: "🍪",
    labels: { ru: "Печенье", uk: "Печиво", cs: "Sušenky", en: "Cookies" },
    aliases: ["cookies", "cookie", "susenky", "печенье", "печиво"],
    patterns: ["susen", "cookie", "cookies", "biscuit", "keks", "печень", "печив", "opavia"],
  },
  {
    key: "drinks",
    icon: "🥤",
    labels: { ru: "Напитки", uk: "Напої", cs: "Nápoje", en: "Drinks" },
    aliases: ["drinks", "drink", "napoje", "напитки", "напої"],
    patterns: ["napoj", "napoje", "drink", "drinks", "limonada", "cola", "kofola", "fanta", "lipton", "чай", "напит", "пиво", "beer", "pivo", "budvar", "pilsner"],
  },
  {
    key: "vegetables",
    icon: "🥬",
    labels: { ru: "Овощи и фрукты", uk: "Овочі та фрукти", cs: "Ovoce a zelenina", en: "Fruit & Veg" },
    aliases: ["vegetables", "fruit", "veg", "ovoce", "zelenina", "овощи", "фрукты", "овочі", "фрукти"],
    patterns: ["zelen", "ovoce", "fruit", "vegetable", "veg", "okurka", "rajcata", "pomerance", "mango", "brambory", "celer", "cibule", "апельс", "огур", "томат", "лук", "селдер", "карт", "овощ", "фрукт"],
  },
  {
    key: "household",
    icon: "🏠",
    labels: { ru: "Для дома", uk: "Для дому", cs: "Pro domácnost", en: "Household" },
    aliases: ["household", "domacnost", "для дома", "для дому"],
    patterns: [
      "cisteni", "clean", "чист", "мыть", "уборк", "toaletni papir", "toilet paper", "туалетная бумага", "папір", "sidolux", "zahisnyk", "protector",
      "засіб", "средство", "чистячий", "shampoo", "sprchovy", "sprcha", "gel", "mydlo", "мыло", "мило", "hygiena", "hygiene",
      "dezodorant", "deodorant", "pampers", "plenka", "pleny", "ubrousek", "влажн", "vlhčen", "avivaz", "praci", "prani", "pranie", "odkur", "odkurovac",
      "toalet", "udrzhba", "sanitar", "sanitni", "koupel", "pracka", "pračka", "cistic", "čistící", "prostředek", "prostredek", "odrez", "zuby", "zubni", "zubní",
      "lepidlo", "adhesive", "glue", "bond", "kartáč", "kartac", "čisticí", "čistici",
    ],
    excludePatterns: [
      "jogurt", "yogurt", "syr", "ser", "cheese", "pivo", "vino", "beer", "napoj", "napoje", "drink", "drinks",
      "mleko", "milk", "chleb", "pecivo", "pečivo", "candy", "cukr", "sušen", "susen", "bonbon", "dětská výživa", "detska vyziva", "výživa", "vyziva", "krmivo", "krmiva",
      "hnojivo", "rostlina", "zelenina", "ovoce", "maso", "ryba", "filé", "rybí", "pečivo",
    ],
  },
  {
    key: "snacks",
    icon: "🍿",
    labels: { ru: "Снеки", uk: "Снеки", cs: "Svačiny", en: "Snacks" },
    aliases: ["snacks", "svaciny", "снеки", "закуски"],
    patterns: [
      "chips", "chipsy", "cipsy", "čipsy", "crackers", "krekry", "kreker", "kraker", "крекер", "крекеры",
      "чипсы", "сухарики", "снэк", "snack", "snacky", "pringles", "lays", "doritos", "cheetos",
      "popcorn", "popkorn", "salty", "slany", "slané", "slane", "arašidy", "orech", "nuts", "nut",
      "seminka", "paleta", "frito", "smartfood", "wafer", "wafers", "sushki", "batonchiki", "candy", "krupky", "křupky",
    ],
  },
];

// Map Kaufland category codes to our product categories
const KAUFLAND_CATEGORY_MAPPING: Record<string, ProductCategoryKey | null> = {
  "01_Maso__drůbež__uzeniny": "meat",
  "02_Ovoce__zelenina__rostliny": "vegetables",
  "03_Mléčné_výrobky__tuky__vejce": "dairy",
  "05_Lahůdky__konzervy": "cookies",
  "06_Základní_potraviny__pečivo": "cookies",
  "07_Káva__čaj_cukrovinky__slané_pochoutky": "snacks",
  "08_Nápoje__lihoviny": "drinks",
  "09_Drogerie__dětská_výživa_a_péče__krmiva": null,
  "0001_TopArticle": null,
};

// Albert categories
const ALBERT_CATEGORY_MAPPING: Record<string, ProductCategoryKey | null> = {
  "01": "meat",
  "03": "dairy",
  "04": "drinks",
  "05": "cookies",
};

// PENNY categories
const PENNY_CATEGORY_MAPPING: Record<string, ProductCategoryKey | null> = {
  "section_0": "meat",
  "section_1": "dairy",
  "section_2": "drinks",
};

// BILLA categories  
const BILLA_CATEGORY_MAPPING: Record<string, ProductCategoryKey | null> = {
  "maso": "meat",
  "mlecne": "dairy",
  "napoje": "drinks",
  "cukroviny": "cookies",
};

// LIDL categories
const LIDL_CATEGORY_MAPPING: Record<string, ProductCategoryKey | null> = {
  "maso": "meat",
  "mlecne": "dairy",
  "napoje": "drinks",
  "sladkosti": "cookies",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function normalizeCategoryCode(value: string) {
  return normalize(value).replace(/\s+/g, " ");
}

function mapSourceCategoryCode(mapping: Record<string, ProductCategoryKey | null>, sourceCode: string) {
  const direct = mapping[sourceCode];
  if (direct !== undefined) {
    return direct;
  }

  const normalizedSource = normalizeCategoryCode(sourceCode);
  for (const [key, target] of Object.entries(mapping)) {
    if (normalizeCategoryCode(key) === normalizedSource) {
      return target;
    }
  }

  return null;
}

export function getCategoriesMenuLabel(language: SupportedLanguage) {
  return t(language, "categories_button");
}

export function getCategoryOptions(language: SupportedLanguage) {
  return CATEGORY_DEFINITIONS.map((category) => ({
    key: category.key,
    text: `${category.icon} ${category.labels[language]}`,
  }));
}

export function getCategoryLabel(language: SupportedLanguage, key: ProductCategoryKey) {
  const category = CATEGORY_DEFINITIONS.find((item) => item.key === key);
  return category ? `${category.icon} ${category.labels[language]}` : key;
}

export function parseCategoryInput(input: string): ProductCategoryKey | null {
  const normalized = normalize(input);

  for (const category of CATEGORY_DEFINITIONS) {
    if (
      normalize(`${category.icon} ${category.labels.ru}`) === normalized ||
      normalize(`${category.icon} ${category.labels.uk}`) === normalized ||
      normalize(`${category.icon} ${category.labels.cs}`) === normalized ||
      normalize(`${category.icon} ${category.labels.en}`) === normalized ||
      category.aliases.some((alias) => normalize(alias) === normalized)
    ) {
      return category.key;
    }
  }

  return null;
}

// Get product category from source category code
export function getCategoryFromSourceCode(sourceCode: string | null | undefined, chain: string | null | undefined): ProductCategoryKey | null {
  if (!sourceCode) return null;

  const code = String(sourceCode);
  let mappedCategory: ProductCategoryKey | null = null;

  switch (chain?.toLowerCase()) {
    case "kaufland":
      mappedCategory = mapSourceCategoryCode(KAUFLAND_CATEGORY_MAPPING, code);
      break;
    case "albert":
      mappedCategory = mapSourceCategoryCode(ALBERT_CATEGORY_MAPPING, code);
      break;
    case "penny":
      mappedCategory = mapSourceCategoryCode(PENNY_CATEGORY_MAPPING, code);
      break;
    case "billa":
      mappedCategory = mapSourceCategoryCode(BILLA_CATEGORY_MAPPING, code);
      break;
    case "lidl":
      mappedCategory = mapSourceCategoryCode(LIDL_CATEGORY_MAPPING, code);
      break;
    default:
      return null;
  }

  // Only return mapped category if it's not null (TopArticle returns null, using pattern matching instead)
  return mappedCategory;
}

export function getCategoryKeyFromText(text: string): ProductCategoryKey | null {
  const normalized = normalize(text);
  let best: { key: ProductCategoryKey | null; score: number } = { key: null, score: 0 };

  for (const category of CATEGORY_DEFINITIONS) {
    const score = scoreCategoryMatch(normalized, category.key);
    if (score > best.score) {
      best = { key: category.key, score };
    }
  }

  return best.key;
}

export function scoreCategoryMatch(text: string, categoryKey: ProductCategoryKey) {
  const normalized = normalize(text);
  const category = CATEGORY_DEFINITIONS.find((item) => item.key === categoryKey);

  if (!category) return 0;

  if (category.excludePatterns?.some((pattern) => normalized.includes(pattern))) {
    return 0;
  }

  if (category.strictPatterns && category.strictPatterns.length > 0) {
    const padded = ` ${normalized} `;
    const hasStrictMatch = category.strictPatterns.some((pattern) =>
      padded.includes(` ${normalize(pattern)} `)
    );

    if (!hasStrictMatch) {
      return 0;
    }
  }

  let score = 0;

  for (const pattern of category.patterns) {
    if (normalized.includes(pattern)) {
      score += 100;
    }
  }

  return score;
}

export function getCategoryEmoji(category?: string): string {
  const map: Record<string, string> = {
    meat: "🥩",
    fish: "🐟",
    dairy: "🥛",
    fruit: "🍎",
    vegetable: "🥔",
    sweets: "🍫",
    drinks: "🥤",
    cleaning: "🧴",
  };

  return map[category || ""] || "🛒";
}

export async function getUserCategoryPreferences(userId: string): Promise<ProductCategoryKey[]> {
  const { data, error } = await db
    .from("user_category_preferences")
    .select("category_key")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch user category preferences:", error);
    return [];
  }

  const rows = data as unknown as Array<{ category_key: ProductCategoryKey | null }>;
  return (rows ?? [])
    .map((row) => row.category_key)
    .filter((key): key is ProductCategoryKey => key !== null && CATEGORY_DEFINITIONS.some((cat) => cat.key === key));
}

export async function saveUserCategoryPreference(userId: string, categoryKey: ProductCategoryKey) {
  const { error } = await db.from("user_category_preferences").upsert({
    user_id: userId,
    category_key: categoryKey,
  }, { onConflict: "user_id,category_key" });

  if (error) {
    console.error("Failed to save user category preference:", error);
    throw error;
  }
}

export async function removeUserCategoryPreference(userId: string, categoryKey: ProductCategoryKey) {
  const { error } = await db.from("user_category_preferences")
    .delete()
    .match({ user_id: userId, category_key: categoryKey });

  if (error) {
    console.error("Failed to remove user category preference:", error);
    throw error;
  }
}

export async function setUserCategoryPreferences(userId: string, categoryKeys: ProductCategoryKey[]) {
  const { error: deleteError } = await db.from("user_category_preferences").delete().eq("user_id", userId);
  if (deleteError) {
    console.error("Failed to clear user category preferences:", deleteError);
    throw deleteError;
  }

  if (categoryKeys.length === 0) {
    return;
  }

  const { error: insertError } = await db.from("user_category_preferences").insert(
    categoryKeys.map((category_key) => ({ user_id: userId, category_key })),
  );

  if (insertError) {
    console.error("Failed to set user category preferences:", insertError);
    throw insertError;
  }
}
