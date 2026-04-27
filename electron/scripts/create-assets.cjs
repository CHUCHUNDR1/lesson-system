const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const zlib = require('node:zlib');

const root = path.join(__dirname, '..', '..');
const buildDir = path.join(root, 'build');
const sourceIcon = path.join(root, 'assets', 'app-icon.png');
const sourceDmgBackground = path.join(root, 'assets', 'dmg-background-source.png');
const dmgWidth = 768;
const dmgHeight = 512;

fs.mkdirSync(buildDir, { recursive: true });

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function color(hex) {
  const normalized = hex.replace('#', '');
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
    normalized.length === 8 ? parseInt(normalized.slice(6, 8), 16) : 255,
  ];
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function blendPixel(data, width, x, y, rgba) {
  if (x < 0 || y < 0 || x >= width) return;
  const index = (y * width + x) * 4;
  if (index < 0 || index >= data.length) return;
  const alpha = rgba[3] / 255;
  data[index] = mix(data[index], rgba[0], alpha);
  data[index + 1] = mix(data[index + 1], rgba[1], alpha);
  data[index + 2] = mix(data[index + 2], rgba[2], alpha);
  data[index + 3] = 255;
}

function fillRect(data, width, height, x, y, w, h, rgba) {
  const minX = Math.max(0, Math.floor(x));
  const minY = Math.max(0, Math.floor(y));
  const maxX = Math.min(width, Math.ceil(x + w));
  const maxY = Math.min(height, Math.ceil(y + h));
  for (let yy = minY; yy < maxY; yy += 1) {
    for (let xx = minX; xx < maxX; xx += 1) {
      blendPixel(data, width, xx, yy, rgba);
    }
  }
}

function fillRoundedRect(data, width, height, x, y, w, h, radius, rgba) {
  const minX = Math.max(0, Math.floor(x));
  const minY = Math.max(0, Math.floor(y));
  const maxX = Math.min(width, Math.ceil(x + w));
  const maxY = Math.min(height, Math.ceil(y + h));
  for (let yy = minY; yy < maxY; yy += 1) {
    for (let xx = minX; xx < maxX; xx += 1) {
      const dx = Math.max(x - xx, 0, xx - (x + w - 1));
      const dy = Math.max(y - yy, 0, yy - (y + h - 1));
      const edgeX = xx < x + radius ? x + radius : xx > x + w - radius ? x + w - radius : xx;
      const edgeY = yy < y + radius ? y + radius : yy > y + h - radius ? y + h - radius : yy;
      const insideCorner = (xx - edgeX) ** 2 + (yy - edgeY) ** 2 <= radius ** 2;
      if ((dx === 0 && dy === 0) || insideCorner) {
        blendPixel(data, width, xx, yy, rgba);
      }
    }
  }
}

function fillCircle(data, width, height, cx, cy, r, rgba) {
  const minX = Math.max(0, Math.floor(cx - r));
  const minY = Math.max(0, Math.floor(cy - r));
  const maxX = Math.min(width, Math.ceil(cx + r));
  const maxY = Math.min(height, Math.ceil(cy + r));
  for (let yy = minY; yy < maxY; yy += 1) {
    for (let xx = minX; xx < maxX; xx += 1) {
      if ((xx - cx) ** 2 + (yy - cy) ** 2 <= r ** 2) {
        blendPixel(data, width, xx, yy, rgba);
      }
    }
  }
}

function createPng(width, height, painter) {
  const data = Buffer.alloc(width * height * 4);
  painter(data, width, height);

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function paintIcon(data, width, height) {
  const top = color('#111827');
  const bottom = color('#0f766e');
  for (let y = 0; y < height; y += 1) {
    const t = y / Math.max(1, height - 1);
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      data[index] = mix(top[0], bottom[0], t);
      data[index + 1] = mix(top[1], bottom[1], t);
      data[index + 2] = mix(top[2], bottom[2], t);
      data[index + 3] = 255;
    }
  }

  fillCircle(data, width, height, width * 0.76, height * 0.2, width * 0.22, color('#34d39955'));
  fillCircle(data, width, height, width * 0.18, height * 0.82, width * 0.24, color('#38bdf855'));
  fillRoundedRect(data, width, height, width * 0.18, height * 0.2, width * 0.64, height * 0.6, width * 0.08, color('#ffffffee'));
  fillRoundedRect(data, width, height, width * 0.24, height * 0.27, width * 0.22, height * 0.46, width * 0.035, color('#ecfeff'));
  fillRoundedRect(data, width, height, width * 0.54, height * 0.27, width * 0.22, height * 0.46, width * 0.035, color('#ecfdf5'));
  fillRect(data, width, height, width * 0.485, height * 0.25, width * 0.03, height * 0.5, color('#0f766e'));
  fillRoundedRect(data, width, height, width * 0.29, height * 0.38, width * 0.12, height * 0.035, width * 0.015, color('#10b981'));
  fillRoundedRect(data, width, height, width * 0.59, height * 0.38, width * 0.12, height * 0.035, width * 0.015, color('#0ea5e9'));
  fillRoundedRect(data, width, height, width * 0.29, height * 0.49, width * 0.1, height * 0.03, width * 0.015, color('#64748b'));
  fillRoundedRect(data, width, height, width * 0.59, height * 0.49, width * 0.1, height * 0.03, width * 0.015, color('#64748b'));
}

function createIco(png) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 0;
  header[7] = 0;
  header[8] = 0;
  header[9] = 0;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
}

function createIcns(png) {
  const chunkLength = 8 + png.length;
  const totalLength = 8 + chunkLength;
  const header = Buffer.alloc(8);
  const chunkHeader = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(totalLength, 4);
  chunkHeader.write('ic10', 0, 4, 'ascii');
  chunkHeader.writeUInt32BE(chunkLength, 4);
  return Buffer.concat([header, chunkHeader, png]);
}

function createBmp(width, height, painter) {
  const rgba = Buffer.alloc(width * height * 4);
  painter(rgba, width, height);

  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const bmp = Buffer.alloc(fileSize);

  bmp.write('BM', 0, 2, 'ascii');
  bmp.writeUInt32LE(fileSize, 2);
  bmp.writeUInt32LE(54, 10);
  bmp.writeUInt32LE(40, 14);
  bmp.writeInt32LE(width, 18);
  bmp.writeInt32LE(height, 22);
  bmp.writeUInt16LE(1, 26);
  bmp.writeUInt16LE(24, 28);
  bmp.writeUInt32LE(pixelArraySize, 34);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const source = ((height - 1 - y) * width + x) * 4;
      const target = 54 + y * rowSize + x * 3;
      bmp[target] = rgba[source + 2];
      bmp[target + 1] = rgba[source + 1];
      bmp[target + 2] = rgba[source];
    }
  }

  return bmp;
}

function paintSidebar(data, width, height) {
  const top = color('#0f172a');
  const bottom = color('#115e59');
  for (let y = 0; y < height; y += 1) {
    const t = y / Math.max(1, height - 1);
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      data[index] = mix(top[0], bottom[0], t);
      data[index + 1] = mix(top[1], bottom[1], t);
      data[index + 2] = mix(top[2], bottom[2], t);
      data[index + 3] = 255;
    }
  }
  fillCircle(data, width, height, width * 0.82, height * 0.18, width * 0.48, color('#34d39944'));
  fillCircle(data, width, height, width * 0.08, height * 0.78, width * 0.5, color('#38bdf833'));
  fillRoundedRect(data, width, height, width * 0.18, height * 0.13, width * 0.64, width * 0.64, width * 0.08, color('#ffffffee'));
  fillRect(data, width, height, width * 0.48, height * 0.17, width * 0.04, width * 0.48, color('#0f766e'));
  fillRoundedRect(data, width, height, width * 0.27, height * 0.27, width * 0.18, height * 0.025, width * 0.01, color('#10b981'));
  fillRoundedRect(data, width, height, width * 0.56, height * 0.27, width * 0.18, height * 0.025, width * 0.01, color('#0ea5e9'));
}

function paintDmg(data, width, height) {
  paintSidebar(data, width, height);
  fillRoundedRect(data, width, height, 34, 48, 492, 276, 22, color('#ffffff18'));
  fillRoundedRect(data, width, height, 58, 72, 444, 228, 18, color('#0f172acc'));
}

function hasCommand(command) {
  return spawnSync('which', [command], { stdio: 'ignore' }).status === 0;
}

function svgEscape(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createDmgSvg(width, height) {
  const iconHref = fs.existsSync(sourceIcon)
    ? `data:image/png;base64,${fs.readFileSync(sourceIcon).toString('base64')}`
    : '';
  const iconLayer = iconHref
    ? `<image href="${iconHref}" x="497" y="58" width="150" height="150" opacity="0.18" filter="url(#softBlur)"/>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#07111f"/>
      <stop offset="0.48" stop-color="#123b42"/>
      <stop offset="1" stop-color="#101623"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#facc15"/>
      <stop offset="0.55" stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#f97316"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.96"/>
      <stop offset="1" stop-color="#e8f7f5" stop-opacity="0.86"/>
    </linearGradient>
    <radialGradient id="leftGlow" cx="28%" cy="48%" r="48%">
      <stop offset="0" stop-color="#f59e0b" stop-opacity="0.46"/>
      <stop offset="1" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="rightGlow" cx="72%" cy="48%" r="45%">
      <stop offset="0" stop-color="#22d3ee" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.32"/>
    </filter>
    <filter id="softBlur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2"/>
    </filter>
  </defs>

  <rect width="${width}" height="${height}" rx="24" fill="url(#bg)"/>
  <rect x="-110" y="-90" width="430" height="430" rx="215" fill="#0ea5e9" opacity="0.18"/>
  <rect x="438" y="-150" width="420" height="420" rx="210" fill="#10b981" opacity="0.18"/>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#leftGlow)"/>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#rightGlow)"/>
  ${iconLayer}

  <path d="M78 355 C162 300, 237 290, 319 232 S489 159, 637 114" fill="none" stroke="#fbbf24" stroke-width="2" opacity="0.18"/>
  <path d="M88 372 C180 314, 270 294, 357 236 S515 174, 655 132" fill="none" stroke="#22d3ee" stroke-width="2" opacity="0.16"/>
  <g opacity="0.24">
    <circle cx="112" cy="342" r="3" fill="#fde68a"/>
    <circle cx="175" cy="315" r="4" fill="#fde68a"/>
    <circle cx="253" cy="291" r="3" fill="#67e8f9"/>
    <circle cx="441" cy="205" r="4" fill="#67e8f9"/>
    <circle cx="598" cy="139" r="3" fill="#fde68a"/>
  </g>

  <rect x="58" y="70" width="604" height="312" rx="28" fill="#07111f" opacity="0.38" filter="url(#shadow)"/>
  <rect x="76" y="88" width="568" height="276" rx="24" fill="#ffffff" opacity="0.08"/>
  <rect x="112" y="142" width="196" height="178" rx="28" fill="#000000" opacity="0.28"/>
  <rect x="428" y="142" width="196" height="178" rx="28" fill="#000000" opacity="0.28"/>
  <rect x="104" y="126" width="196" height="178" rx="28" fill="#f8fffd" opacity="0.94"/>
  <rect x="420" y="126" width="196" height="178" rx="28" fill="#f8fffd" opacity="0.94"/>
  <rect x="126" y="146" width="152" height="2" rx="1" fill="#ffffff" opacity="0.92"/>
  <rect x="442" y="146" width="152" height="2" rx="1" fill="#ffffff" opacity="0.92"/>

  <path d="M325 214 H382" fill="none" stroke="url(#gold)" stroke-width="8" stroke-linecap="round"/>
  <path d="M371 196 L391 214 L371 232" fill="none" stroke="#fbbf24" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <g opacity="0.78">
    <circle cx="336" cy="214" r="5" fill="#fde68a"/>
    <circle cx="358" cy="214" r="5" fill="#fbbf24"/>
    <circle cx="380" cy="214" r="5" fill="#f59e0b"/>
  </g>

  <text x="360" y="47" text-anchor="middle" fill="#f8fafc" font-family="Helvetica Neue, Arial, sans-serif" font-size="30" font-weight="800" letter-spacing="0">Lesson System</text>
  <text x="360" y="405" text-anchor="middle" fill="#e0f2fe" font-family="Helvetica Neue, Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="0">${svgEscape('Перетащите приложение в папку Applications')}</text>
  <text x="360" y="430" text-anchor="middle" fill="#a7f3d0" font-family="Helvetica Neue, Arial, sans-serif" font-size="13" font-weight="500" letter-spacing="0">${svgEscape('Преподаватель, студенты и проектор синхронизируются в локальной сети')}</text>
</svg>`;
}

function createDmgBackground() {
  const fallback = () => createPng(dmgWidth, dmgHeight, paintDmg);
  const tmpDir = path.join(buildDir, '.dmg-work');
  const pngPath = path.join(tmpDir, 'dmg-background.png');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  if (fs.existsSync(sourceDmgBackground)) {
    if (hasCommand('magick')) {
      const result = spawnSync('magick', [
        sourceDmgBackground,
        '-resize',
        `${dmgWidth}x${dmgHeight}^`,
        '-gravity',
        'center',
        '-extent',
        `${dmgWidth}x${dmgHeight}`,
        pngPath,
      ], { stdio: 'inherit' });

      if (result.status === 0 && fs.existsSync(pngPath)) {
        const png = fs.readFileSync(pngPath);
        fs.rmSync(tmpDir, { recursive: true, force: true });
        return png;
      }
    }

    if (hasCommand('sips')) {
      const result = spawnSync('sips', [
        '-z',
        String(dmgHeight),
        String(dmgWidth),
        sourceDmgBackground,
        '--out',
        pngPath,
      ], { stdio: 'inherit' });

      if (result.status === 0 && fs.existsSync(pngPath)) {
        const png = fs.readFileSync(pngPath);
        fs.rmSync(tmpDir, { recursive: true, force: true });
        return png;
      }
    }
  }

  if (!hasCommand('magick')) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return fallback();
  }

  const svgPath = path.join(tmpDir, 'dmg-background.svg');
  const fontCacheDir = path.join(buildDir, '.font-cache');
  fs.mkdirSync(fontCacheDir, { recursive: true });
  fs.writeFileSync(svgPath, createDmgSvg(dmgWidth, dmgHeight));

  const result = spawnSync('magick', [svgPath, pngPath], {
    env: { ...process.env, XDG_CACHE_HOME: fontCacheDir },
    stdio: 'inherit',
  });
  if (result.status !== 0 || !fs.existsSync(pngPath)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return fallback();
  }

  const png = fs.readFileSync(pngPath);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return png;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

function createAssetsFromSourceIcon() {
  if (!fs.existsSync(sourceIcon) || process.platform !== 'darwin') {
    return false;
  }

  const tmpDir = path.join(buildDir, '.icon-work');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  const icon1024 = path.join(buildDir, 'icon.png');
  const icon256 = path.join(tmpDir, 'icon-256.png');
  run('sips', ['-z', '1024', '1024', sourceIcon, '--out', icon1024]);
  run('sips', ['-z', '256', '256', sourceIcon, '--out', icon256]);

  fs.writeFileSync(path.join(buildDir, 'icon.icns'), createIcns(fs.readFileSync(icon1024)));
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), createIco(fs.readFileSync(icon256)));

  const sidebarPng = path.join(tmpDir, 'installer-sidebar.png');
  run('sips', ['-z', '314', '164', sourceIcon, '--out', sidebarPng]);
  run('sips', ['-s', 'format', 'bmp', sidebarPng, '--out', path.join(buildDir, 'installer-sidebar.bmp')]);

  fs.writeFileSync(path.join(buildDir, 'dmg-background.png'), createDmgBackground());
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return true;
}

if (createAssetsFromSourceIcon()) {
  console.log(`Desktop build assets written to ${buildDir} from ${sourceIcon}`);
  process.exit(0);
}

const icon1024 = createPng(1024, 1024, paintIcon);
const icon256 = createPng(256, 256, paintIcon);
const dmgBackground = createDmgBackground();
const sidebar = createBmp(164, 314, paintSidebar);

fs.writeFileSync(path.join(buildDir, 'icon.png'), icon1024);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), createIco(icon256));
fs.writeFileSync(path.join(buildDir, 'icon.icns'), createIcns(icon1024));
fs.writeFileSync(path.join(buildDir, 'dmg-background.png'), dmgBackground);
fs.writeFileSync(path.join(buildDir, 'installer-sidebar.bmp'), sidebar);

console.log(`Desktop build assets written to ${buildDir}`);
