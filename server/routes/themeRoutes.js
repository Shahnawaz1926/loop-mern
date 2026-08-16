const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const { getThemes, getThemeFeedback, getThemeTrends } = require('../controllers/themeController');

router.get('/', requireAuth, getThemes);
router.get('/trends', requireAuth, getThemeTrends);
router.get('/:id/feedback', requireAuth, getThemeFeedback);

module.exports = router;