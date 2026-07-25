const express = require('express');
const { getCurrentPlaylist } = require('../controllers/specialController');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Unauthenticated by design — this is what every TV player polls every 60s.
router.get('/current-playlist', apiLimiter, getCurrentPlaylist);

module.exports = router;
