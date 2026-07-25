const express = require('express');
const { login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/login', authLimiter, validateLogin, login);
router.get('/me', protect, getMe);

module.exports = router;
