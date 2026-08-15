const User = require('../models/User');
const bcrypt = require('bcryptjs');

// GET /api/workspace/members - any authenticated user can view
async function getMembers(req, res) {
  try {
    const members = await User.find({ workspaceId: req.user.workspaceId })
      .select('name email role createdAt');
    res.json({ members });
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ error: 'Failed to fetch members.' });
  }
}

// POST /api/workspace/members - ADMIN only, invite/add a teammate
async function addMember(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!['ADMIN', 'ANALYST', 'VIEWER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      workspaceId: req.user.workspaceId, // scoped to the admin's own workspace
    });

    res.status(201).json({
      member: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: 'Failed to add member.' });
  }
}

// PATCH /api/workspace/members/:id/role - ADMIN only, change someone's role
async function updateMemberRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['ADMIN', 'ANALYST', 'VIEWER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    // Critical: only allow updating members within the admin's OWN workspace
    const member = await User.findOne({ _id: id, workspaceId: req.user.workspaceId });
    if (!member) {
      return res.status(404).json({ error: 'Member not found in your workspace.' });
    }

    member.role = role;
    await member.save();

    res.json({ member: { id: member._id, name: member.name, email: member.email, role: member.role } });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Failed to update role.' });
  }
}

module.exports = { getMembers, addMember, updateMemberRole };