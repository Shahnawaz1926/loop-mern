const express = require('express');
const multer = require('multer');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { createFeedback, getFeedback, updateFeedbackStatus, uploadCSV, simulateChannel} = require('../controllers/feedbackController');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', requireAuth, getFeedback);
router.post('/', requireAuth, requireRole('ADMIN', 'ANALYST'), createFeedback);
router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'ANALYST'), updateFeedbackStatus);
router.post('/upload', requireAuth, requireRole('ADMIN', 'ANALYST'), upload.single('file'), uploadCSV);
router.post('/simulate/:channel', requireAuth, requireRole('ADMIN', 'ANALYST'), simulateChannel);

module.exports = router;