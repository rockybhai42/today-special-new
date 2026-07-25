const fs = require('fs');
const path = require('path');

// Runs once before any test file, in a separate process from the tests
// themselves — creates the throwaway uploads dir tests write into (see
// UPLOADS_DIR in package.json's test script / config/env.js).
module.exports = async function globalSetup() {
  const root = path.resolve(__dirname, 'tmp-uploads');
  for (const sub of ['images', 'videos', 'tmp']) {
    fs.mkdirSync(path.join(root, sub), { recursive: true });
  }
};
