const fs = require('fs');
const path = require('path');
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error(
    'Missing dependency: Please run `npm install` to install required packages (sharp).'
  );
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(projectRoot, 'assets');
const androidRes = path.join(
  projectRoot,
  'android',
  'app',
  'src',
  'main',
  'res'
);
const iosAssets = path.join(
  projectRoot,
  'ios',
  'EduForestParent',
  'Images.xcassets'
);

const iconSrc = path.join(assetsDir, 'icon.png');
const adaptiveSrc = path.join(assetsDir, 'adaptive-icon.png');
const splashSrc = path.join(assetsDir, 'splash-icon.png');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function generateAndroid() {
  console.log('Generating Android assets...');
  const densities = {
    mdpi: 1,
    hdpi: 1.5,
    xhdpi: 2,
    xxhdpi: 3,
    xxxhdpi: 4,
  };

  // Launcher icon base size (mdpi)
  const baseLauncher = 48; // mdpi px
  // Foreground base for adaptive icon (use adaptive-icon if available)
  const baseForeground = 108; // recommended
  // Splash logo base (mdpi)
  const baseSplash = 200;

  for (const [folder, scale] of Object.entries(densities)) {
    const mipmap = path.join(androidRes, `mipmap-${folder}`);
    ensureDir(mipmap);
    // Remove any existing webp launcher files to avoid duplicate resource errors
    const webpFiles = [
      'ic_launcher.webp',
      'ic_launcher_foreground.webp',
      'ic_launcher_round.webp',
    ];
    for (const f of webpFiles) {
      const p = path.join(mipmap, f);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch (e) {
          console.warn(`Could not remove ${p}:`, e.message);
        }
      }
    }
    const launcherSize = Math.round(baseLauncher * scale);
    const foregroundSize = Math.round(baseForeground * scale);
    const splashSize = Math.round(baseSplash * scale);

    // ic_launcher (simple square icon)
    if (fs.existsSync(iconSrc)) {
      await sharp(iconSrc)
        .resize(launcherSize, launcherSize, { fit: 'cover' })
        .toFile(path.join(mipmap, 'ic_launcher.png'));
    }

    // ic_launcher_foreground (use adaptive-icon if present else icon)
    if (fs.existsSync(adaptiveSrc)) {
      await sharp(adaptiveSrc)
        .resize(foregroundSize, foregroundSize, { fit: 'contain' })
        .toFile(path.join(mipmap, 'ic_launcher_foreground.png'));
    } else if (fs.existsSync(iconSrc)) {
      await sharp(iconSrc)
        .resize(foregroundSize, foregroundSize, { fit: 'contain' })
        .toFile(path.join(mipmap, 'ic_launcher_foreground.png'));
    }

    // ic_launcher_round - same as foreground
    if (fs.existsSync(path.join(mipmap, 'ic_launcher_foreground.png'))) {
      await sharp(path.join(mipmap, 'ic_launcher_foreground.png')).toFile(
        path.join(mipmap, 'ic_launcher_round.png')
      );
    }

    // Splashscreen logo
    const drawableFolder = path.join(androidRes, `drawable-${folder}`);
    ensureDir(drawableFolder);
    if (fs.existsSync(splashSrc)) {
      await sharp(splashSrc)
        .resize(splashSize, splashSize, { fit: 'contain' })
        .toFile(path.join(drawableFolder, 'splashscreen_logo.png'));
    }
  }

  // Also write to drawable (default) and drawable-*/fallbacks
  ensureDir(path.join(androidRes, 'drawable'));
  if (fs.existsSync(splashSrc)) {
    await sharp(splashSrc)
      .resize(baseSplash * densities.mdpi, baseSplash * densities.mdpi, {
        fit: 'contain',
      })
      .toFile(path.join(androidRes, 'drawable', 'splashscreen_logo.png'));
  }

  console.log('Android assets generated.');
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

async function generateIos() {
  console.log('Generating iOS assets...');
  // AppIcon sizes and idioms
  const appIconSetDir = path.join(iosAssets, 'AppIcon.appiconset');
  ensureDir(appIconSetDir);

  const icons = [
    { size: 20, scales: [1, 2, 3], idiom: 'iphone' },
    { size: 29, scales: [1, 2, 3], idiom: 'iphone' },
    { size: 40, scales: [1, 2, 3], idiom: 'iphone' },
    { size: 60, scales: [2, 3], idiom: 'iphone' },
    { size: 76, scales: [1, 2], idiom: 'ipad' },
    { size: 83.5, scales: [2], idiom: 'ipad' },
    { size: 1024, scales: [1], idiom: 'ios-marketing' },
  ];

  const contents = { images: [], info: { version: 1, author: 'xcode' } };

  for (const icon of icons) {
    for (const scale of icon.scales) {
      const px = Math.round(icon.size * scale);
      const filename = `icon_${icon.size}x${scale}.png`.replace('.', '_');
      const filePath = path.join(appIconSetDir, filename);
      if (fs.existsSync(iconSrc)) {
        await sharp(iconSrc).resize(px, px, { fit: 'cover' }).toFile(filePath);
      }
      contents.images.push({
        idiom: icon.idiom,
        size: `${icon.size}x${icon.size}`,
        filename,
        scale: `${scale}x`,
      });
    }
  }

  writeJson(path.join(appIconSetDir, 'Contents.json'), contents);

  // Splash legacy imageset
  const splashSet = path.join(iosAssets, 'SplashScreenLegacy.imageset');
  ensureDir(splashSet);
  const splashContents = { images: [], info: { version: 1, author: 'xcode' } };
  if (fs.existsSync(splashSrc)) {
    // create 1x and 2x
    const sizes = [
      { name: 'splash.png', scale: 1, px: 320 },
      { name: 'splash@2x.png', scale: 2, px: 640 },
    ];
    for (const s of sizes) {
      const out = path.join(splashSet, s.name);
      await sharp(splashSrc).resize(s.px, s.px, { fit: 'contain' }).toFile(out);
      splashContents.images.push({
        filename: s.name,
        idiom: 'universal',
        scale: `${s.scale}x`,
      });
    }
  }
  writeJson(path.join(splashSet, 'Contents.json'), splashContents);

  console.log('iOS assets generated.');
}

async function run() {
  try {
    await generateAndroid();
  } catch (e) {
    console.error('Android generation failed:', e);
  }
  try {
    await generateIos();
  } catch (e) {
    console.error('iOS generation failed:', e);
  }
  console.log(
    '\nDone. Run `npm run android` or open Xcode to verify native assets.'
  );
}

run();
