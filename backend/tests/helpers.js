const bcrypt = require('bcrypt');
const User = require('../models/User');

/** Creates an admin user directly in the DB (mirrors what seedAdmin.js does). */
async function createTestUser({ email = 'admin@example.com', password = 'Password123', username = 'admin' } = {}) {
  const passwordHash = await bcrypt.hash(password, 4); // low cost factor — this only needs to be correct, not slow, in tests
  const user = await User.create({ email, passwordHash, username, role: 'admin' });
  return { user, email, password };
}

/** Creates a user and logs in through the real endpoint, returning a usable Bearer token. */
async function getAuthToken(request, app, overrides) {
  const { email, password } = await createTestUser(overrides);
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.token;
}

module.exports = { createTestUser, getAuthToken };
