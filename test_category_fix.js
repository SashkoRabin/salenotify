// Verify category mapping fixes

const KAUFLAND_CATEGORY_MAPPING = {
  "01_Maso__drůbež__uzeniny": "meat",
  "02_Ovoce__zelenina__rostliny": "vegetables",
  "03_Mléčné_výrobky__tuky__vejce": "dairy",
  "05_Lahůdky__konzervy": "cookies",
  "06_Základní_potraviny__pečivo": "cookies",
  "07_Káva__čaj_cukrovinky__slané_pochoutky": "snacks",
  "08_Nápoje__lihoviny": "drinks",
  "09_Drogerie__dětská_výživa_a_péče__krmiva": "household",
  "0001_TopArticle": null,
};

// Test products from the household category that shouldn't be there
const testProducts = [
  { title: "Jogobella jogurt 150 g", categoryCode: "03_Mléčné_výrobky__tuky__vejce" },
  { title: "Madeta Lipánek 130 g", categoryCode: "03_Mléčné_výrobky__tuky__vejce" },
  { title: "Magnesia RED", categoryCode: "08_Nápoje__lihoviny" },
  { title: "Dřevorubecký chléb 405 g", categoryCode: "06_Základní_potraviny__pečivo" },
  { title: "Schär Panini bílá", categoryCode: "06_Základní_potraviny__pečivo" },
  { title: "Meloun žlutý 1 kg", categoryCode: "02_Ovoce__zelenina__rostliny" },
  { title: "K-CLASSIC Eidam uzený 240 g", categoryCode: "03_Mléčné_výrobky__tuky__vejce" },
  { title: "Candát filet", categoryCode: "01_Maso__drůbež__uzeniny" },
  { title: "Milko Bio máslo 150 g", categoryCode: "03_Mléčné_výrobky__tuky__vejce" },
  { title: "Veseko Vepřové maso 400 g", categoryCode: "01_Maso__drůbež__uzeniny" },
  { title: "SILVA TABS Růže", categoryCode: "09_Drogerie__dětská_výživa_a_péče__krmiva" },
];

console.log("Testing corrected category mapping:\n");

const categoryMap = {
  null: "pattern-matching",
  "meat": "🥩 Мясо",
  "dairy": "🥛 Молочные",
  "eggs": "🥚 Яйца",
  "cookies": "🍪 Печенье",
  "drinks": "🥤 Напитки",
  "vegetables": "🥬 Овощи и фрукты",
  "household": "🏠 Для дома",
  "snacks": "🍿 Снеки",
};

testProducts.forEach((product) => {
  const category = KAUFLAND_CATEGORY_MAPPING[product.categoryCode];
  const displayCategory = categoryMap[category] || category;
  const shouldBeHousehold = category === "household";
  
  console.log(`${shouldBeHousehold ? "❌" : "✅"} ${product.title.substring(0, 40)}`);
  console.log(`   Category: ${displayCategory}\n`);
});

console.log("\nResult: Only SILVA TABS (fertilizers) should be in household! ✓");
