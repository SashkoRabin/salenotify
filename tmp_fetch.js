const urls = [
  'https://www.kupi.cz/letaky/penny-market',
  'https://www.kupi.cz/letaky/penny',
  'https://penny.cz/nabidky'
];

(async () => {
  for (const url of urls) {
    try {
      const r = await fetch(url);
      console.log('URL', url, 'status', r.status, 'ok', r.ok);
      const text = await r.text();
      console.log('len', text.length);
      console.log(text.slice(0, 1200));
      console.log('---');
    } catch (e) {
      console.error('ERR', url, e);
    }
  }
})();
