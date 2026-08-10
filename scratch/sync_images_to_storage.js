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

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncImages(limit = 10) {
  console.log(`Starting Image Sync to Supabase Storage ('villa-images' bucket)...`);

  // Fetch images from villa_images that point to old domain
  const { data: rows, error } = await supabase
    .from('villa_images')
    .select('id, villa_id, storage_path')
    .like('storage_path', '%kastayimbugunvillalari.com%')
    .limit(limit);

  if (error) {
    console.error('Error fetching villa_images:', error);
    return;
  }

  console.log(`Found ${rows.length} images needing upload to Supabase Storage.`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const oldUrl = row.storage_path;

    try {
      console.log(`[${i + 1}/${rows.length}] Downloading: ${oldUrl}`);
      const res = await fetch(oldUrl);
      if (!res.ok) {
        console.warn(`Failed to download ${oldUrl}: ${res.status}`);
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());

      // Extract filename
      const urlParts = oldUrl.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0] || `img_${Date.now()}.jpg`;
      const storageFilePath = `${row.villa_id}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('villa-images')
        .upload(storageFilePath, buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadErr) {
        console.error(`Upload failed for ${storageFilePath}:`, uploadErr.message);
        continue;
      }

      // Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('villa-images')
        .getPublicUrl(storageFilePath);

      const newPublicUrl = publicUrlData.publicUrl;

      // Update database row with new Supabase Storage URL
      await supabase
        .from('villa_images')
        .update({ storage_path: newPublicUrl })
        .eq('id', row.id);

      console.log(`  └─ ✅ Uploaded & Updated DB to: ${newPublicUrl}`);
    } catch (err) {
      console.error(`Error syncing image ${oldUrl}:`, err.message);
    }
  }

  console.log(`\n🎉 Image Sync finished for ${rows.length} images!`);
}

const limitArg = parseInt(process.argv[2], 10) || 10;
syncImages(limitArg);
