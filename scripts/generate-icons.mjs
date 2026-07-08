import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const sourceSvg = path.join(root, 'assets', 'icon-source.svg');

const targets = [
  { file: 'public/favicon.png', size: 32 },
  { file: 'public/favicon-48.png', size: 48 },
  { file: 'public/logo180.png', size: 180 },
  { file: 'public/logo192.png', size: 192 },
  { file: 'public/logo512.png', size: 512 },
  { file: 'assets/favicon.png', size: 48 },
  { file: 'assets/icon.png', size: 1024 },
  { file: 'assets/adaptive-icon.png', size: 1024 },
  { file: 'assets/splash-icon.png', size: 512 },
];

async function renderPng(outputPath, size) {
  const buffer = await sharp(sourceSvg).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
}

async function renderIco(outputPath) {
  const png32 = await sharp(sourceSvg).resize(32, 32).png().toBuffer();
  await writeFile(outputPath, png32);
}

async function main() {
  for (const { file, size } of targets) {
    const outputPath = path.join(root, file);
    await renderPng(outputPath, size);
    console.log(`✓ ${file} (${size}x${size})`);
  }

  await renderIco(path.join(root, 'public', 'favicon.ico'));
  console.log('✓ public/favicon.ico');
  console.log('Iconos generados.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
