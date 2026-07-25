module.exports = {
  testEnvironment: 'node',
  // mongodb-memory-server downloads a MongoDB binary on first run in this
  // environment; give that (and the server startup itself) room to finish.
  testTimeout: 30000,
  clearMocks: true,
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
};
