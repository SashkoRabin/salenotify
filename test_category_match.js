// Test script to verify snack category matching
const text = "Lay's Chipsy 55 g";
const snackPatterns = ["chips", "crackers", "krekry", "чипсы", "сухарики", "крекеры", "snack", "снек", "pringles", "lays", "doritos", "cheetos", "chipsy", "brambor", "popcorn", "popkorn", "salty", "slany", "arašidy", "orech", "nuts", "nut", "seminka", "bagetka", "solusky", "paleta", "frito", "smartfood", "wafer", "wafers", "sushki", "batonchiki", "candy", "coldrink", "limonade", "juice"];

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const normalized = normalize(text);
console.log(`Text: "${text}"`);
console.log(`Normalized: "${normalized}"`);
console.log("");

let score = 0;
let matches = [];

for (const pattern of snackPatterns) {
  if (normalized.includes(pattern)) {
    score += 100;
    matches.push(pattern);
  }
}

console.log(`Snack score: ${score}`);
console.log(`Matched patterns: ${matches.join(", ")}`);
console.log(`Would be categorized as: ${score > 0 ? "SNACKS ✓" : "NO MATCH ✗"}`);
