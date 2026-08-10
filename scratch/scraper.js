const fs = require('fs');

function parseVillaHtml(html, url) {
  if (!html.includes('id="detail"') && !html.includes('class="detail-slider-1"')) {
    return null;
  }

  const nameMatch = html.match(/<h1>\s*(.*?)\s*<\/h1>/i);
  const name = nameMatch ? nameMatch[1].trim() : '';

  const slugMatch = url.match(/\/tr\/([^\/]+)\//);
  const slug = slugMatch ? slugMatch[1] : name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const locMatch = html.match(/class="loc">[\s\S]*?<span>\s*(.*?)\s*<\/span>/i);
  const locationRaw = locMatch ? locMatch[1].trim() : '';
  const [province, region] = locationRaw.includes('/')
    ? locationRaw.split('/').map((s) => s.trim())
    : ['Kaş', locationRaw || 'Kaş'];

  const capacityMatch = html.match(/class="sp sp1">[\s\S]*?<b>\s*(\d+)\s*<\/b>\s*Kişilik/i);
  const bedroomsMatch = html.match(/class="sp sp2">[\s\S]*?<b>\s*(\d+)\s*<\/b>\s*Yatak Odası/i);
  const bathroomsMatch = html.match(/class="sp sp3">[\s\S]*?<b>\s*(\d+)\s*<\/b>\s*Banyo/i);

  const capacity = capacityMatch ? parseInt(capacityMatch[1], 10) : 0;
  const bedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1], 10) : 0;
  const bathrooms = bathroomsMatch ? parseInt(bathroomsMatch[1], 10) : 0;

  const images = [];
  const imgRegex = /data-full=["']([^"']+)["']/g;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    if (!images.includes(imgMatch[1])) {
      images.push(imgMatch[1]);
    }
  }

  if (images.length === 0) {
    const hrefImgRegex = /href=["'](https:\/\/www\.kastayimbugunvillalari\.com\/upload\/catalog\/[^"']+\.(?:jpg|png|jpeg|webp))["']/gi;
    while ((imgMatch = hrefImgRegex.exec(html)) !== null) {
      if (!images.includes(imgMatch[1])) {
        images.push(imgMatch[1]);
      }
    }
  }

  const descMatch = html.match(/<div class="detail-text">\s*<p>\s*([\s\S]*?)\s*<\/p>\s*<\/div>/i);
  const descriptionTr = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  const ribbons = [];
  const ribbonRegex = /<span class="ribbon\d+">\s*(.*?)\s*<\/span>/gi;
  let ribbonMatch;
  while ((ribbonMatch = ribbonRegex.exec(html)) !== null) {
    ribbons.push(ribbonMatch[1].trim());
  }

  const amenities = [];
  const amenRegex = /<li><i class="fa fa-check-square-o"[^>]*><\/i>\s*(.*?)\s*<\/li>/gi;
  let amenMatch;
  while ((amenMatch = amenRegex.exec(html)) !== null) {
    amenities.push(amenMatch[1].trim());
  }

  const seasons = [];
  const priceBlockRegex = /<li class="price_block"[^>]*>[\s\S]*?<span class="dt">\s*(.*?)\s*<\/span>[\s\S]*?<span class="pr">\s*&#8378;\s*([\d\.\s]+)\s*<\/span>[\s\S]*?<\/li>/gi;
  let pMatch;
  while ((pMatch = priceBlockRegex.exec(html)) !== null) {
    const dateRange = pMatch[1].trim();
    const priceStr = pMatch[2].replace(/[^\d]/g, '');
    const price = parseInt(priceStr, 10) || 0;

    seasons.push({
      labelTr: dateRange,
      price,
      rawRange: dateRange,
    });
  }

  const distances = [];
  const distRegex = /<li class="[^"]*">\s*<span class="s1"><i[^>]*><\/i>\s*(.*?)\s*<\/span>\s*<span class="s2">\s*(.*?)\s*<\/span>\s*<\/li>/gi;
  let dMatch;
  while ((dMatch = distRegex.exec(html)) !== null) {
    distances.push({
      name: dMatch[1].trim(),
      value: dMatch[2].trim(),
    });
  }

  return {
    sourceUrl: url,
    slug,
    name,
    province,
    region,
    capacity,
    bedrooms,
    bathrooms,
    descriptionTr,
    tags: ribbons,
    amenities,
    seasons,
    distances,
    imagesCount: images.length,
    images,
  };
}

async function runScrapeTest() {
  const sitemapPath = 'C:/Users/Murat/.gemini/antigravity/brain/6750ab01-b4e7-49f3-a02e-53ffc6476d51/.system_generated/steps/92/content.md';
  const xmlContent = fs.readFileSync(sitemapPath, 'utf8');

  const locRegex = /<loc>(https:\/\/www\.kastayimbugunvillalari\.com\/tr\/[^\/]+\/)<\/loc>/g;
  const urls = [];
  let match;
  while ((match = locRegex.exec(xmlContent)) !== null) {
    urls.push(match[1]);
  }

  console.log(`Scanning ${urls.length} URLs for test extraction...`);
  const scrapedVillas = [];

  for (const url of urls) {
    if (scrapedVillas.length >= 5) break;

    try {
      console.log(`Fetching: ${url}`);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!res.ok) continue;

      const html = await res.text();
      const villa = parseVillaHtml(html, url);

      if (villa && villa.name && villa.images.length > 0) {
        console.log(`✔ Extracted Villa: ${villa.name} (${villa.images.length} images, ${villa.capacity} guests)`);
        scrapedVillas.push(villa);
      }
    } catch (err) {
      console.error(`Failed to fetch ${url}:`, err.message);
    }
  }

  fs.writeFileSync(
    'd:/kastayimbugun/scratch/sample_villas.json',
    JSON.stringify(scrapedVillas, null, 2),
    'utf8'
  );

  console.log(`\n🎉 Test extraction complete! Saved ${scrapedVillas.length} villas to scratch/sample_villas.json`);
}

runScrapeTest();
