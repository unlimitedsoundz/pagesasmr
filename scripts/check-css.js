async function run() {
  const res = await fetch('http://localhost:3000');
  const html = await res.text();
  console.log('HTML length:', html.length);
  
  const cssMatches = html.match(/href="([^"]+\.css[^"]*)"/g);
  console.log('CSS links found in HTML:', cssMatches);

  if (cssMatches) {
    for (const match of cssMatches) {
      const path = match.replace('href="', '').replace('"', '');
      const fullUrl = path.startsWith('http') ? path : 'http://localhost:3000' + path;
      console.log('Fetching CSS from:', fullUrl);
      const cssRes = await fetch(fullUrl);
      console.log('CSS status:', cssRes.status);
      const cssText = await cssRes.text();
      console.log('CSS bytes:', cssText.length);
      console.log('Tailwind classes present (bg-ivory, font-serif, flex)?', {
        hasFlex: cssText.includes('.flex'),
        hasBgIvory: cssText.includes('ivory'),
        hasPlum: cssText.includes('plum'),
      });
    }
  } else {
    console.log('NO CSS LINKS FOUND IN HTML!');
  }
}

run().catch(console.error);
