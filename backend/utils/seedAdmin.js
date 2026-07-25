const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config/env');
const logger = require('./logger');
const User = require('../models/User');

/**
 * Provisions (or updates the password of) the single admin account used to
 * log into the manager dashboard. There is no self-service signup by
 * design — run `npm run seed:admin` with ADMIN_* env vars set instead.
 */
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !username || !password) {
    logger.error('ADMIN_EMAIL, ADMIN_USERNAME and ADMIN_PASSWORD must be set to seed an admin');
    process.exitCode = 1;
    return;
  }

  if (password.length < 8) {
    logger.error('ADMIN_PASSWORD must be at least 8 characters');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(config.mongodbUri);

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { username, email: email.toLowerCase(), passwordHash, role: 'admin' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  logger.info('Admin user ready', { email: user.email, username: user.username });
  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  logger.error('Failed to seed admin user', { error: err.message });
  process.exitCode = 1;
  mongoose.disconnect();
});
