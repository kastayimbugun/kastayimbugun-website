const fs = require('fs');

async function testScrape() {
  const sitemapPath = 'C:/Users/Murat/.gemini/antigravity/brain/6750ab01-b4e7-49f3-a02e-53ffc6476d51/.system_generated/steps/92/content.md';
  const xmlContent = fs.readFileSync(sitemapPath, 'utf8');

  // Extract all <loc> URLs
  const locRegex = /<loc>(https:\/\/www\.kastayimbugunvillalari\.com\/tr\/[^\/]+\/)<\/loc>/g;
  const urls = [];
  let match;
  while ((match = locRegex.exec(xmlContent)) !== null) {
    const url = match[1];
    // Filter out non-villa static pages
    if (
      !url.includes('/hakkimizda/') &&
      !url.includes('/kiralama-kosullari/') &&
      !url.includes('/kiralik-villa/') &&
      !url.includes('/kiralik-apart/') &&
      !url.includes('/iletisim/') &&
      !url.includes('/sikcasorulansorular/') &&
      !url.includes('/blog/') &&
      !url.includes('/cerez-politikasi/') &&
      !url.includes('/kisisel-verilerin-korunmasi') &&
      !url.includes('/nasil-rezervasyon-yapabilirim/') &&
      !url.includes('/oneri-ve-sikayetleriniz/') &&
      !url.includes('/rezervasyon-rehberi/') &&
      !url.includes('/villa-kiralamada-dikkat/')
    ) {
      urls.push(url);
    }
  }

  console.log(`Found ${urls.length} candidate URLs from sitemap.`);
  console.log('Sample 10 URLs:', urls.slice(0, 10));
}

testScrape();
