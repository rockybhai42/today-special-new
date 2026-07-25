const fs = require('fs');
const path = require('path');

module.exports = async function globalTeardown() {
  fs.rmSync(path.resolve(__dirname, 'tmp-uploads'), { recursive: true, force: true });
};
