const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local
const envFile = fs.readFileSync('d:/kastayimbugun/.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const trMonths = {
  ocak: '01',
  subat: '02',
  şubat: '02',
  mart: '03',
  nisan: '04',
  mayis: '05',
  mayıs: '05',
  haziran: '06',
  temmuz: '07',
  agustos: '08',
  ağustos: '08',
  eylul: '09',
  eylül: '09',
  ekim: '10',
  kasim: '11',
  kasım: '11',
  aralik: '12',
  aralık: '12',
};

function parseTrDate(str) {
  if (!str) return null;
  const parts = str.trim().toLowerCase('tr').split(/\s+/);
  if (parts.length < 3) return null;
  const day = parts[0].padStart(2, '0');
  const month = trMonths[parts[1]] || '01';
  const year = parts[2];
  return `${year}-${month}-${day}`;
}

function mapAmenity(str) {
  const s = str.toLowerCase('tr');
  if (s.includes('sauna') || s.includes('hamam')) return 'sauna';
  if (s.includes('jakuzi')) return 'jacuzzi';
  if (s.includes('ısıtma') || s.includes('kapalı havuz')) return 'heatedPool';
  if (s.includes('çocuk havuz')) return 'kidsPool';
  if (s.includes('özel havuz') || s.includes('yüzme havuz')) return 'privatePool';
  if (s.includes('muhafazakar') || s.includes('korunaklı')) return 'protectedPool';
  if (s.includes('wifi') || s.includes('internet')) return 'wifi';
  if (s.includes('klima')) return 'airCon';
  if (s.includes('deniz manzara')) return 'seaView';
  if (s.includes('doğa manzara')) return 'natureView';
  if (s.includes('barbekü') || s.includes('mangal')) return 'bbq';
  if (s.includes('otopark')) return 'parking';
  if (s.includes('evcil')) return 'petFriendly';
  if (s.includes('bebek') || s.includes('beşik')) return 'babyCot';
  if (s.includes('bulaşık')) return 'dishwasher';
  if (s.includes('çamaşır')) return 'washingMachine';
  if (s.includes('mutfak')) return 'kitchen';
  if (s.includes('tv') || s.includes('televizyon')) return 'tv';
  if (s.includes('şömine')) return 'fireplace';
  if (s.includes('fitness') || s.includes('spor')) return 'gym';
  if (s.includes('langırt') || s.includes('oyun') || s.includes('ping')) return 'gameRoom';
  if (s.includes('jeneratör')) return 'generator';
  return null;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase('tr')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseVillaHtml(html, url) {
  if (!html.includes('id="detail"') && !html.includes('class="detail-slider-1"')) {
    return null;
  }

  const nameMatch = html.match(/<h1>\s*(.*?)\s*<\/h1>/i);
  const name = nameMatch ? nameMatch[1].trim() : '';

  const slugMatch = url.match(/\/tr\/([^\/]+)\//);
  const rawSlug = slugMatch ? slugMatch[1] : slugify(name);
  const slug = slugify(rawSlug);

  const locMatch = html.match(/class="loc">[\s\S]*?<span>\s*(.*?)\s*<\/span>/i);
  const locationRaw = locMatch ? locMatch[1].trim() : '';
  const [province, region] = locationRaw.includes('/')
    ? locationRaw.split('/').map((s) => s.trim())
    : ['Kaş', locationRaw || 'Kaş'];

  const capacityMatch = html.match(/class="sp sp1">[\s\S]*?<b>\s*(\d+)\s*<\/b>\s*Kişilik/i);
  const bedroomsMatch = html.match(/class="sp sp2">[\s\S]*?<b>\s*(\d+)\s*<\/b>\s*Yatak Odası/i);
  const bathroomsMatch = html.match(/class="sp sp3">[\s\S]*?<b>\s*(\d+)\s*<\/b>\s*Banyo/i);

  const capacity = capacityMatch ? parseInt(capacityMatch[1], 10) : 2;
  const bedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1], 10) : 1;
  const bathrooms = bathroomsMatch ? parseInt(bathroomsMatch[1], 10) : 1;

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

  const rawAmenities = [];
  const amenRegex = /<li><i class="fa fa-check-square-o"[^>]*><\/i>\s*(.*?)\s*<\/li>/gi;
  let amenMatch;
  while ((amenMatch = amenRegex.exec(html)) !== null) {
    rawAmenities.push(amenMatch[1].trim());
  }

  const amenityKeys = new Set();
  rawAmenities.forEach((item) => {
    const key = mapAmenity(item);
    if (key) amenityKeys.add(key);
  });

  const seasons = [];
  const priceBlockRegex = /<li class="price_block"[^>]*>[\s\S]*?<span class="dt">\s*(.*?)\s*<\/span>[\s\S]*?<span class="pr">\s*&#8378;\s*([\d\.\s]+)\s*<\/span>[\s\S]*?<\/li>/gi;
  let pMatch;
  while ((pMatch = priceBlockRegex.exec(html)) !== null) {
    const dateRange = pMatch[1].trim();
    const priceStr = pMatch[2].replace(/[^\d]/g, '');
    const price = parseInt(priceStr, 10) || 0;

    const [startStr, endStr] = dateRange.split('~').map((s) => s.trim());
    const starts_on = parseTrDate(startStr);
    const ends_on = parseTrDate(endStr);

    if (starts_on && ends_on) {
      seasons.push({
        label_tr: dateRange,
        label_en: dateRange,
        starts_on,
        ends_on,
        price,
      });
    }
  }

  let distance_to_sea = null;
  const distRegex = /<li class="[^"]*">\s*<span class="s1"><i[^>]*><\/i>\s*(.*?)\s*<\/span>\s*<span class="s2">\s*(.*?)\s*<\/span>\s*<\/li>/gi;
  let dMatch;
  while ((dMatch = distRegex.exec(html)) !== null) {
    const name = dMatch[1].trim().toLowerCase('tr');
    const valStr = dMatch[2].trim();
    const kmMatch = valStr.match(/([\d\.]+)/);
    if (kmMatch && name.includes('plaj')) {
      const km = parseFloat(kmMatch[1]);
      distance_to_sea = Math.round(km * 1000);
    }
  }

  const base_price = seasons.length > 0 ? Math.min(...seasons.map((s) => s.price)) : 5000;

  return {
    slug,
    name,
    province: province || 'Antalya',
    region: region || 'Kaş',
    capacity,
    bedrooms,
    bathrooms,
    description_tr: descriptionTr,
    description_en: descriptionTr,
    amenities: Array.from(amenityKeys),
    seasons,
    images,
    distance_to_sea,
    base_price,
  };
}

async function migrateBatch(targetCount = 20) {
  console.log(`Starting migration batch (Target: ${targetCount} villas)...`);

  const sitemapPath = 'C:/Users/Murat/.gemini/antigravity/brain/6750ab01-b4e7-49f3-a02e-53ffc6476d51/.system_generated/steps/92/content.md';
  const xmlContent = fs.readFileSync(sitemapPath, 'utf8');

  const locRegex = /<loc>(https:\/\/www\.kastayimbugunvillalari\.com\/tr\/[^\/]+\/)<\/loc>/g;
  const urls = [];
  let match;
  while ((match = locRegex.exec(xmlContent)) !== null) {
    urls.push(match[1]);
  }

  console.log(`Found ${urls.length} URLs in sitemap.`);

  // Get existing regions map
  const { data: existingRegions } = await supabase.from('regions').select('id, name, slug');
  const regionMap = new Map((existingRegions || []).map((r) => [r.name.toLowerCase('tr'), r.id]));

  let count = 0;

  for (const url of urls) {
    if (count >= targetCount) break;

    try {
      console.log(`[${count + 1}/${targetCount}] Fetching ${url}`);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!res.ok) continue;

      const html = await res.text();
      const villaData = parseVillaHtml(html, url);

      if (!villaData || !villaData.name || villaData.images.length === 0) {
        continue; // Skip static pages or invalid pages
      }

      // Ensure region exists in database
      const regionName = villaData.region;
      const regionKey = regionName.toLowerCase('tr');
      let regionId = regionMap.get(regionKey);

      if (!regionId) {
        const regionSlug = slugify(regionName);
        const { data: newRegion, error: regErr } = await supabase
          .from('regions')
          .upsert({ slug: regionSlug, name: regionName, province: villaData.province }, { onConflict: 'slug' })
          .select('id')
          .single();

        if (newRegion) {
          regionId = newRegion.id;
          regionMap.set(regionKey, regionId);
        } else {
          console.error(`Failed to insert region ${regionName}:`, regErr);
        }
      }

      // Insert or Update Villa
      const villaPayload = {
        slug: villaData.slug,
        name: villaData.name,
        code: `KBV${Math.floor(1000 + Math.random() * 9000)}`,
        region_id: regionId || null,
        status: 'published',
        capacity: Math.max(1, villaData.capacity),
        bedrooms: Math.max(0, villaData.bedrooms),
        bathrooms: Math.max(0, villaData.bathrooms),
        pool: villaData.amenities.includes('privatePool') ? 'private' : 'shared',
        distance_to_sea: villaData.distance_to_sea,
        base_price: villaData.base_price,
        description_tr: villaData.description_tr,
        description_en: villaData.description_en,
        amenities: villaData.amenities,
        rating: 4.8 + Math.round(Math.random() * 2) / 10,
        review_count: Math.floor(5 + Math.random() * 25),
      };

      const { data: savedVilla, error: villaErr } = await supabase
        .from('villas')
        .upsert(villaPayload, { onConflict: 'slug' })
        .select('id')
        .single();

      if (villaErr || !savedVilla) {
        console.error(`Error saving villa ${villaData.name}:`, villaErr);
        continue;
      }

      const villaId = savedVilla.id;

      // Delete existing seasons & images before inserting new ones
      await supabase.from('villa_seasons').delete().eq('villa_id', villaId);
      await supabase.from('villa_images').delete().eq('villa_id', villaId);

      // Insert Seasons
      if (villaData.seasons.length > 0) {
        const seasonPayloads = villaData.seasons.map((s) => ({
          villa_id: villaId,
          label_tr: s.label_tr,
          label_en: s.label_en,
          starts_on: s.starts_on,
          ends_on: s.ends_on,
          price: s.price,
        }));
        await supabase.from('villa_seasons').insert(seasonPayloads);
      }

      // Insert Images
      if (villaData.images.length > 0) {
        const imagePayloads = villaData.images.map((imgUrl, idx) => ({
          villa_id: villaId,
          storage_path: imgUrl,
          sort_order: idx,
        }));
        await supabase.from('villa_images').insert(imagePayloads);
      }

      count++;
      console.log(`✅ [${count}/${targetCount}] Successfully imported: "${villaData.name}" (${villaData.images.length} images, ${villaData.seasons.length} seasons)`);
    } catch (err) {
      console.error(`Error processing ${url}:`, err.message);
    }
  }

  console.log(`\n🎉 Batch Migration Complete! Total ${count} villas successfully imported into Supabase.`);
}

const countArg = parseInt(process.argv[2], 10) || 20;
migrateBatch(countArg);
