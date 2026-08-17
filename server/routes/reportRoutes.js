const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { generateReport, getReports, getReportById } = require('../controllers/reportController');

router.post('/generate', requireAuth, requireRole('ADMIN', 'ANALYST'), generateReport);
router.get('/', requireAuth, getReports);
router.get('/:id', requireAuth, getReportById);

module.exports = router;