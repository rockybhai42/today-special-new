/**
 * Consistent JSON envelope for every API response so the dashboard's
 * Axios layer can handle success/error uniformly.
 */
function success(res, statusCode, data, message = 'OK') {
  return res.status(statusCode).json({ success: true, message, data });
}

function failure(res, statusCode, message, errors = null) {
  return res.status(statusCode).json({ success: false, message, errors });
}

module.exports = { success, failure };
