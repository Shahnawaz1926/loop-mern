const express = require('express');
const multer = require('multer');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { createFeedback, getFeedback, updateFeedbackStatus,reclassifyFeedback, uploadCSV, simulateChannel, backfillClassify, askLoop, backfillEmbeddings} = require('../controllers/feedbackController');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', requireAuth, getFeedback);
router.post('/', requireAuth, requireRole('ADMIN', 'ANALYST'), createFeedback);
router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'ANALYST'), updateFeedbackStatus);
router.post('/upload', requireAuth, requireRole('ADMIN', 'ANALYST'), upload.single('file'), uploadCSV);
router.post('/simulate/:channel', requireAuth, requireRole('ADMIN', 'ANALYST'), simulateChannel);
router.post('/:id/reclassify', requireAuth, requireRole('ADMIN', 'ANALYST'), reclassifyFeedback);
router.post('/backfill-classify', requireAuth, requireRole('ADMIN'), backfillClassify);
router.post('/ask', requireAuth, askLoop);
router.post('/backfill-embeddings', requireAuth, requireRole('ADMIN'), backfillEmbeddings);

module.exports = router;