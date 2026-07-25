const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { failure } = require('../utils/apiResponse');
const User = require('../models/User');

/**
 * Verifies the Bearer token and attaches the authenticated user to req.user.
 * Rejects if the user no longer exists (e.g. deleted after token issuance).
 */
async function protect(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return failure(res, 401, 'Not authorized, no token provided');
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id);

    if (!user) {
      return failure(res, 401, 'Not authorized, user no longer exists');
    }

    req.user = user;
    return next();
  } catch (err) {
    return failure(res, 401, 'Not authorized, invalid or expired token');
  }
}

module.exports = { protect };
