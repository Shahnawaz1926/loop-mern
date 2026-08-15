const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { getMembers, addMember, updateMemberRole } = require('../controllers/workspaceController');

router.get('/members', requireAuth, getMembers);
router.post('/members', requireAuth, requireRole('ADMIN'), addMember);
router.patch('/members/:id/role', requireAuth, requireRole('ADMIN'), updateMemberRole);

module.exports = router;