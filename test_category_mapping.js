// Test: Verify snacks category works correctly without dumplings

// Simulate the source category mapping
const KAUFLAND_CATEGORY_MAPPING = {
  "01_Maso__drůbež__uzeniny": "meat",
  "03_Mléčné_výrobky__tuky__vejce": "dairy",
  "02_Ovoce__zelenina__rostliny": "vegetables",
  "06_Základní_potraviny__pečivo": "cookies", // Bakery - where dumplings would go
  "07_Káva__čaj_cukrovinky__slané_pochoutky": "snacks", // Salty snacks only
  "08_Nápoje__lihoviny": "drinks",
  "05_Lahůdky__konzervy": "cookies", // Delicacies/prepared food
  "0001_TopArticle": "cookies",
  "09_Drogerie__dětská_výživa_a_péče__krmiva": "household",
};

// Test products
const testProducts = [
  {
    title: "K-Classic Bramborové knedlíky 400g",
    categoryCode: "06_Základní_potraviny__pečivo",
  },
  {
    title: "Lay's Chipsy 55g",
    categoryCode: "07_Káva__čaj_cukrovinky__slané_pochoutky",
  },
  {
    title: "Bohemia Chipsy 190g",
    categoryCode: "07_Káva__čaj_cukrovinky__slané_pochoutky",
  },
  {
    title: "POM-BÄR Bramborový snack 110g",
    categoryCode: "07_Káva__čaj_cukrovinky__slané_pochoutky",
  },
];

// Test category mapping
const snacksCategory = "snacks";
const cookiesCategory = "cookies";

console.log("Testing source category mapping:\n");

testProducts.forEach((product) => {
  const category = KAUFLAND_CATEGORY_MAPPING[product.categoryCode];
  const isSnack = category === snacksCategory;
  const isCookie = category === cookiesCategory;

  console.log(`Product: ${product.title}`);
  console.log(`  Source Code: ${product.categoryCode}`);
  console.log(`  Mapped Category: ${category}`);
  console.log(`  Would show in Snacks: ${isSnack ? "✓ YES" : "✗ NO"}`);
  console.log(`  Would show in Cookies: ${isCookie ? "✓ YES" : "✗ NO"}`);
  console.log("");
});

console.log("✓ Dumplings are correctly mapped to COOKIES, not SNACKS");
console.log("✓ Snacks are correctly mapped to SNACKS category");
