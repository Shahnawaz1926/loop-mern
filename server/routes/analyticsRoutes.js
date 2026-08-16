const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const { getSummary } = require('../controllers/analyticsController');

router.get('/summary', requireAuth, getSummary);

module.exports = router;