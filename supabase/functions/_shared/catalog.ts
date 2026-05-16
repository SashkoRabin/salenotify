export const CZECH_CITIES = [
  { name: "Praha", slug: "praha", region: "Prague" },
  { name: "Brno", slug: "brno", region: "South Moravian" },
  { name: "Ostrava", slug: "ostrava", region: "Moravian-Silesian" },
  { name: "Plzen", slug: "plzen", region: "Pilsen" },
  { name: "Liberec", slug: "liberec", region: "Liberec" },
  { name: "Olomouc", slug: "olomouc", region: "Olomouc" },
  { name: "Ceske Budejovice", slug: "ceske-budejovice", region: "South Bohemian" },
  { name: "Hradec Kralove", slug: "hradec-kralove", region: "Hradec Kralove" },
  { name: "Pardubice", slug: "pardubice", region: "Pardubice" },
  { name: "Zlin", slug: "zlin", region: "Zlin" },
  { name: "Usti nad Labem", slug: "usti-nad-labem", region: "Usti nad Labem" },
  { name: "Karlovy Vary", slug: "karlovy-vary", region: "Karlovy Vary" },
  { name: "Jihlava", slug: "jihlava", region: "Vysocina" },
  { name: "Beroun", slug: "beroun", region: "Central Bohemian" },
  { name: "Kladno", slug: "kladno", region: "Central Bohemian" },
  { name: "Most", slug: "most", region: "Usti nad Labem" },
  { name: "Teplice", slug: "teplice", region: "Usti nad Labem" },
  { name: "Chomutov", slug: "chomutov", region: "Usti nad Labem" },
  { name: "Decin", slug: "decin", region: "Usti nad Labem" },
  { name: "Mlada Boleslav", slug: "mlada-boleslav", region: "Central Bohemian" },
  { name: "Benesov", slug: "benesov", region: "Central Bohemian" },
  { name: "Pribram", slug: "pribram", region: "Central Bohemian" },
  { name: "Kolin", slug: "kolin", region: "Central Bohemian" },
  { name: "Kutna Hora", slug: "kutna-hora", region: "Central Bohemian" },
  { name: "Nymburk", slug: "nymburk", region: "Central Bohemian" },
  { name: "Podebrady", slug: "podebrady", region: "Central Bohemian" },
  { name: "Tabor", slug: "tabor", region: "South Bohemian" },
  { name: "Pisek", slug: "pisek", region: "South Bohemian" },
  { name: "Strakonice", slug: "strakonice", region: "South Bohemian" },
  { name: "Cesky Krumlov", slug: "cesky-krumlov", region: "South Bohemian" },
  { name: "Trutnov", slug: "trutnov", region: "Hradec Kralove" },
  { name: "Nachod", slug: "nachod", region: "Hradec Kralove" },
  { name: "Jicin", slug: "jicin", region: "Hradec Kralove" },
  { name: "Chrudim", slug: "chrudim", region: "Pardubice" },
  { name: "Svitavy", slug: "svitavy", region: "Pardubice" },
  { name: "Ceska Lipa", slug: "ceska-lipa", region: "Liberec" },
  { name: "Jablonec nad Nisou", slug: "jablonec-nad-nisou", region: "Liberec" },
  { name: "Turnov", slug: "turnov", region: "Liberec" },
  { name: "Cheb", slug: "cheb", region: "Karlovy Vary" },
  { name: "Sokolov", slug: "sokolov", region: "Karlovy Vary" },
  { name: "Litomerice", slug: "litomerice", region: "Usti nad Labem" },
  { name: "Lovosice", slug: "lovosice", region: "Usti nad Labem" },
  { name: "Varnsdorf", slug: "varnsdorf", region: "Usti nad Labem" },
  { name: "Frydek-Mistek", slug: "frydek-mistek", region: "Moravian-Silesian" },
  { name: "Havirov", slug: "havirov", region: "Moravian-Silesian" },
  { name: "Karvina", slug: "karvina", region: "Moravian-Silesian" },
  { name: "Opava", slug: "opava", region: "Moravian-Silesian" },
  { name: "Prerov", slug: "prerov", region: "Olomouc" },
  { name: "Prostejov", slug: "prostejov", region: "Olomouc" },
  { name: "Vyskov", slug: "vyskov", region: "South Moravian" },
  { name: "Kromeriz", slug: "kromeriz", region: "Zlin" },
  { name: "Uherske Hradiste", slug: "uherske-hradiste", region: "Zlin" },
  { name: "Hodonin", slug: "hodonin", region: "South Moravian" },
  { name: "Breclav", slug: "breclav", region: "South Moravian" },
  { name: "Znojmo", slug: "znojmo", region: "South Moravian" },
  { name: "Trebic", slug: "trebic", region: "Vysocina" },
  { name: "Havlickuv Brod", slug: "havlickuv-brod", region: "Vysocina" },
] as const;

export const SUPPORTED_CHAINS = [
  { code: "kaufland", name: "Kaufland", aliases: ["kaufland"] },
  { code: "penny", name: "PENNY", aliases: ["penny"] },
  { code: "albert", name: "Albert", aliases: ["albert", "альберт"] },
  { code: "lidl", name: "Lidl", aliases: ["lidl", "лидл"] },
  { code: "billa", name: "BILLA", aliases: ["billa", "билла"] },
] as const;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function findCityByInput(input: string) {
  const normalizedInput = normalize(input);

  return CZECH_CITIES.find((city) =>
    normalize(city.name) === normalizedInput ||
    city.slug.replace(/-/g, " ") === normalizedInput
  );
}

export function findCitySuggestions(input: string, limit = 6) {
  const normalizedInput = normalize(input);

  if (!normalizedInput) {
    return [];
  }

  return CZECH_CITIES
    .map((city) => {
      const normalizedName = normalize(city.name);
      const normalizedSlug = city.slug.replace(/-/g, " ");

      let score = 0;

      if (normalizedName === normalizedInput || normalizedSlug === normalizedInput) {
        score += 100;
      }
      if (normalizedName.startsWith(normalizedInput) || normalizedSlug.startsWith(normalizedInput)) {
        score += 50;
      }
      if (normalizedName.includes(normalizedInput) || normalizedSlug.includes(normalizedInput)) {
        score += 20;
      }

      return { city, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.city.name.localeCompare(right.city.name))
    .slice(0, limit)
    .map((item) => item.city);
}

export function parseChains(input: string) {
  const normalizedParts = input
    .split(",")
    .map((item) => normalize(item))
    .filter(Boolean);

  if (
    normalizedParts.includes("all") ||
    normalizedParts.includes("all chains") ||
    normalizedParts.includes("all chain") ||
    normalizedParts.includes("vse") ||
    normalizedParts.includes("все") ||
    normalizedParts.includes("все сети") ||
    normalizedParts.includes("усі мережі") ||
    normalizedParts.includes("vsechny retezce") ||
    normalizedParts.includes("vsechny retezece")
  ) {
    return [...SUPPORTED_CHAINS];
  }

  return SUPPORTED_CHAINS.filter((chain) =>
    normalizedParts.includes(normalize(chain.name)) ||
    normalizedParts.includes(chain.code) ||
    chain.aliases.some((alias) => normalizedParts.includes(normalize(alias)))
  );
}
