const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config/env');
const User = require('../models/User');
const { success, failure } = require('../utils/apiResponse');

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/**
 * POST /api/auth/login
 * There is no public registration endpoint by design — admin accounts are
 * provisioned via the seed script, not self-service signup.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return failure(res, 401, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return failure(res, 401, 'Invalid email or password');
    }

    const token = signToken(user);
    return success(res, 200, {
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    }, 'Login successful');
  } catch (err) {
    return next(err);
  }
}

/** GET /api/auth/me */
async function getMe(req, res) {
  const { _id, username, email, role, createdAt } = req.user;
  return success(res, 200, { id: _id, username, email, role, createdAt });
}

module.exports = { login, getMe };
