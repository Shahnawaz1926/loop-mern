const Feedback = require('../models/Feedback');

// POST /api/feedback - create a single feedback item
async function createFeedback(req, res) {
  try {
    const { content, channel, customerLabel, sourceRef } = req.body;

    if (!content || !channel) {
      return res.status(400).json({ error: 'Content and channel are required.' });
    }

    const feedback = await Feedback.create({
      content,
      channel,
      customerLabel,
      sourceRef,
      workspaceId: req.user.workspaceId, // tenant isolation - always scope to caller's workspace
      status: 'NEW',
    });

    res.status(201).json({ feedback });
  } catch (err) {
    console.error('Create feedback error:', err);
    res.status(500).json({ error: 'Failed to create feedback.' });
  }
}

// GET /api/feedback - list with pagination + filters
async function getFeedback(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      channel,
      sentiment,
      status,
      search,
    } = req.query;

    // ALWAYS scope to the caller's workspace - this is the non-negotiable tenant isolation rule
    const query = { workspaceId: req.user.workspaceId };

    if (channel) query.channel = channel;
    if (sentiment) query.sentiment = sentiment;
    if (status) query.status = status;
    if (search) query.content = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Feedback.countDocuments(query),
    ]);

    res.json({
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('Get feedback error:', err);
    res.status(500).json({ error: 'Failed to fetch feedback.' });
  }
}

// PATCH /api/feedback/:id/status - update status (NEW -> REVIEWED -> ACTIONED)
async function updateFeedbackStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['NEW', 'REVIEWED', 'ACTIONED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    // Critical: filter by BOTH id and workspaceId - prevents cross-tenant access
    const feedback = await Feedback.findOne({ _id: id, workspaceId: req.user.workspaceId });
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found in your workspace.' });
    }

    feedback.status = status;
    await feedback.save();

    res.json({ feedback });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update status.' });
  }
}

module.exports = { createFeedback, getFeedback, updateFeedbackStatus };