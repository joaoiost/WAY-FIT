import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const svgRaw = fs.readFileSync(path.join(__dirname, 'public', 'icon.svg'));

fs.mkdirSync(path.join(__dirname, 'assets'), { recursive: true });

// Icon 1024x1024
const icon = new Resvg(svgRaw, { fitTo: { mode: 'width', value: 1024 } });
fs.writeFileSync(path.join(__dirname, 'assets', 'icon-only.png'), icon.render().asPng());
console.log('✓ assets/icon-only.png (1024x1024)');

// Splash 2732x2732 — ícone centralizado em fundo gradiente
const iconSize = 600;
const splashSize = 2732;
const offset = Math.round((splashSize - iconSize) / 2);

const splashSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${splashSize}" height="${splashSize}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0F172A"/>
      <stop offset="100%" style="stop-color:#1E1B4B"/>
    </linearGradient>
  </defs>
  <rect width="${splashSize}" height="${splashSize}" fill="url(#bg)"/>
  <g transform="translate(${offset}, ${offset - 60})">
    <rect width="${iconSize}" height="${iconSize}" rx="${iconSize * 0.188}" fill="url(#ic)"/>
    <defs>
      <linearGradient id="ic" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#3B82F6"/>
        <stop offset="100%" style="stop-color:#8B5CF6"/>
      </linearGradient>
    </defs>
    <polygon points="${iconSize*0.566},${iconSize*0.156} ${iconSize*0.352},${iconSize*0.547} ${iconSize*0.5},${iconSize*0.547} ${iconSize*0.434},${iconSize*0.844} ${iconSize*0.648},${iconSize*0.453} ${iconSize*0.5},${iconSize*0.453} ${iconSize*0.566},${iconSize*0.156}" fill="white"/>
  </g>
  <text x="${splashSize/2}" y="${offset + iconSize + 80}" text-anchor="middle" font-family="Arial, sans-serif" font-size="120" font-weight="800" fill="white">WAY FIT</text>
</svg>`;

const splash = new Resvg(Buffer.from(splashSvg), { fitTo: { mode: 'width', value: splashSize } });
fs.writeFileSync(path.join(__dirname, 'assets', 'splash.png'), splash.render().asPng());
console.log('✓ assets/splash.png (2732x2732)');

// Splash dark (mesmo)
fs.copyFileSync(path.join(__dirname, 'assets', 'splash.png'), path.join(__dirname, 'assets', 'splash-dark.png'));
console.log('✓ assets/splash-dark.png');

console.log('\nPronto! Rode agora: npx capacitor-assets generate --android');
