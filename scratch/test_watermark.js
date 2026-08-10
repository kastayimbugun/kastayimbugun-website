const fs = require('fs');
const sharp = require('sharp');

async function createWatermark() {
  const logoSvgPath = 'd:/kastayimbugun/public/logo.svg';
  const logoSvg = fs.readFileSync(logoSvgPath, 'utf8');

  // Create semi-transparent white watermark SVG based on public/logo.svg
  // We wrap the SVG and apply fill-opacity or opacity
  const watermarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="180" viewBox="0 0 634 189" opacity="0.35">
    <style>
      path, g { fill: #ffffff !important; }
    </style>
    ${logoSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}
  </svg>`;

  // Create test background image (1200x800 dark ocean/villa blue gradient)
  const baseImage = await sharp({
    create: {
      width: 1200,
      height: 800,
      channels: 3,
      background: { r: 40, g: 60, b: 90 },
    },
  })
    .jpeg()
    .toBuffer();

  // Composite watermark on top
  const output = await sharp(baseImage)
    .composite([
      {
        input: Buffer.from(watermarkSvg),
        gravity: 'center',
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  fs.writeFileSync('d:/kastayimbugun/scratch/watermark_sample.jpg', output);
  console.log('🎉 Watermark sample generated at d:/kastayimbugun/scratch/watermark_sample.jpg');
}

createWatermark();
