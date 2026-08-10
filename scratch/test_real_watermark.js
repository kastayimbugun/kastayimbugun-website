const fs = require('fs');
const sharp = require('sharp');

async function applyWatermarkToRealImage() {
  const sampleUrl = 'https://www.kastayimbugunvillalari.com/upload/catalog/3389/1920/8h0a6607-208.jpg';
  console.log(`Fetching real image from ${sampleUrl}...`);

  const res = await fetch(sampleUrl);
  const arrayBuffer = await res.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  const logoSvgPath = 'd:/kastayimbugun/public/logo.svg';
  const logoSvg = fs.readFileSync(logoSvgPath, 'utf8');

  const meta = await sharp(imageBuffer).metadata();
  const imgW = meta.width || 1200;
  const imgH = meta.height || 800;

  const logoWidth = Math.round(imgW * 0.45);
  const logoHeight = Math.round(logoWidth * (189 / 634));

  const watermarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${logoWidth}" height="${logoHeight}" viewBox="0 0 634 189" opacity="0.35">
    <style>
      path, g { fill: #ffffff !important; }
    </style>
    ${logoSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}
  </svg>`;

  const watermarkedBuffer = await sharp(imageBuffer)
    .composite([
      {
        input: Buffer.from(watermarkSvg),
        gravity: 'center',
      },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();

  fs.writeFileSync('d:/kastayimbugun/scratch/real_watermarked.jpg', watermarkedBuffer);
  console.log('🎉 Watermark successfully applied to real villa photo! Saved to d:/kastayimbugun/scratch/real_watermarked.jpg');
}

applyWatermarkToRealImage();
