const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

const removableEntries = [
  '.DS_Store',
  '.desktop-data',
  'release-fix',
  'release-fix-test-data',
  'release-test-data',
];

for (const entry of removableEntries) {
  fs.rmSync(path.join(projectRoot, entry), { recursive: true, force: true });
}
