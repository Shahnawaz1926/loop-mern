const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { createFeedback, getFeedback, updateFeedbackStatus } = require('../controllers/feedbackController');

// Viewers can only read; Analysts and Admins can create/edit
router.get('/', requireAuth, getFeedback);
router.post('/', requireAuth, requireRole('ADMIN', 'ANALYST'), createFeedback);
router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'ANALYST'), updateFeedbackStatus);

module.exports = router;