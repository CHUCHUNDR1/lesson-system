const fs = require('fs');
const path = require('path');

const releaseDir = path.join(__dirname, '..', 'release');

if (!fs.existsSync(releaseDir)) {
  process.exit(0);
}

const removableEntries = new Set([
  '.DS_Store',
  'builder-debug.yml',
  'win-arm64-unpacked',
  'win-unpacked',
]);

for (const entry of fs.readdirSync(releaseDir, { withFileTypes: true })) {
  const fullPath = path.join(releaseDir, entry.name);
  const shouldRemove =
    removableEntries.has(entry.name) ||
    entry.name.endsWith('.nsis.7z');

  if (!shouldRemove) {
    continue;
  }

  fs.rmSync(fullPath, { recursive: true, force: true });
}
