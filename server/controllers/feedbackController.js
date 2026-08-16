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

const { parse } = require('csv-parse/sync');

// POST /api/feedback/upload - bulk CSV import
async function uploadCSV(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const csvText = req.file.buffer.toString('utf-8');

    let records;
    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseErr) {
      return res.status(400).json({ error: 'Could not parse CSV file. Check the format.' });
    }

    const results = {
      imported: 0,
      failed: 0,
      errors: [],
    };

    const validItems = [];

    records.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because row 1 is the header, and arrays are 0-indexed

      if (!row.content || !row.channel) {
        results.failed++;
        results.errors.push(`Row ${rowNumber}: missing required field (content or channel).`);
        return;
      }

      validItems.push({
        content: row.content,
        channel: row.channel,
        customerLabel: row.customer_label || row.customerLabel || undefined,
        sourceRef: row.source_ref || undefined,
        workspaceId: req.user.workspaceId,
        status: 'NEW',
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      });
    });

    if (validItems.length > 0) {
      await Feedback.insertMany(validItems);
      results.imported = validItems.length;
    }

    res.json(results);
  } catch (err) {
    console.error('CSV upload error:', err);
    res.status(500).json({ error: 'Failed to process CSV upload.' });
  }
}

const SIMULATED_CONTENT = {
  app_store: [
    "Five stars, this app changed how our team handles feedback.",
    "Crashes on startup after the latest update, please fix.",
    "Wish there was a dark mode option, otherwise solid app.",
    "The search feature is slow when filtering large datasets.",
    "Fantastic customer support, resolved my issue in minutes.",
  ],
  support_ticket: [
    "Unable to reset password, the reset link keeps expiring.",
    "Feature request: bulk delete option for old feedback items.",
    "Getting a 500 error when uploading files larger than 5MB.",
    "Account got locked after too many login attempts, need help.",
    "Billing was charged twice this month, please refund.",
  ],
  social_mention: [
    "Just started using this tool at work, actually pretty solid.",
    "Anyone else having trouble with the mobile app today?",
    "Our team switched from a spreadsheet to this and never looked back.",
    "Customer support response time could be faster honestly.",
    "Love how clean the dashboard looks compared to competitors.",
  ],
};

// POST /api/feedback/simulate/:channel - simulate pulling from an integration
async function simulateChannel(req, res) {
  try {
    const { channel } = req.params;

    if (!SIMULATED_CONTENT[channel]) {
      return res.status(400).json({
        error: `Unknown channel. Available: ${Object.keys(SIMULATED_CONTENT).join(', ')}`,
      });
    }

    const contentPool = SIMULATED_CONTENT[channel];
    const itemsToCreate = contentPool.map((content, i) => ({
      content,
      channel,
      customerLabel: `Simulated Customer ${Date.now()}-${i}`,
      workspaceId: req.user.workspaceId,
      status: 'NEW',
    }));

    await Feedback.insertMany(itemsToCreate);

    res.json({
      message: `Simulated ${itemsToCreate.length} new items from ${channel}.`,
      imported: itemsToCreate.length,
    });
  } catch (err) {
    console.error('Simulate channel error:', err);
    res.status(500).json({ error: 'Failed to simulate channel.' });
  }
}

module.exports = { createFeedback, getFeedback, updateFeedbackStatus, uploadCSV, simulateChannel };
