const { failure } = require('../utils/apiResponse');

/**
 * Lightweight request-shape validation. Mongoose schema validation is the
 * source of truth for business rules; these checks exist to fail fast on
 * structurally malformed requests before they ever reach the database layer.
 */

function validateLogin(req, res, next) {
  const { email, password } = req.body;
  if (!email || typeof email !== 'string') {
    return failure(res, 400, 'email is required');
  }
  if (!password || typeof password !== 'string') {
    return failure(res, 400, 'password is required');
  }
  return next();
}

function validateSpecialInput(req, res, next) {
  const { title, dishName, price, mediaType } = req.body;

  if (req.method === 'POST') {
    if (!title || !dishName) {
      return failure(res, 400, 'title and dishName are required');
    }
    if (price === undefined || price === null || Number.isNaN(Number(price))) {
      return failure(res, 400, 'price is required and must be a number');
    }
    if (!mediaType || !['image', 'video'].includes(mediaType)) {
      return failure(res, 400, 'mediaType must be "image" or "video"');
    }
  }

  if (price !== undefined && Number.isNaN(Number(price))) {
    return failure(res, 400, 'price must be a number');
  }

  if (mediaType !== undefined && !['image', 'video'].includes(mediaType)) {
    return failure(res, 400, 'mediaType must be "image" or "video"');
  }

  return next();
}

function validateReorder(req, res, next) {
  const { order } = req.body;
  if (!Array.isArray(order) || order.length === 0) {
    return failure(res, 400, 'order must be a non-empty array of { id, displayOrder }');
  }
  const isValid = order.every(
    (item) => item && typeof item.id === 'string' && Number.isFinite(Number(item.displayOrder))
  );
  if (!isValid) {
    return failure(res, 400, 'Each order entry requires a string id and numeric displayOrder');
  }
  return next();
}

module.exports = { validateLogin, validateSpecialInput, validateReorder };
