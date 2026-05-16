async function testReverso() {
  const texts = ["Kaufland", "Mléko plnotučné 1l", "Chleb celozrnný"];

  for (const text of texts) {
    try {
      const response = await fetch("https://api.reverso.net/translate/v1/translation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: text,
          from: "cs",
          to: "uk",
          format: "text",
        }),
      });

      console.log(`Status for ${text}:`, response.status);
      const data = await response.json();
      console.log(`Data for ${text}:`, data.translation?.[0]);
    } catch (error) {
      console.error(`Error for ${text}:`, error);
    }
  }
}

testReverso();