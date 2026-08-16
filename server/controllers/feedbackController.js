const Feedback = require('../models/Feedback');
const Theme = require('../models/Theme');
const { classifyFeedback } = require('../lib/ai');

// Helper: classify a feedback item and update it with results
async function classifyAndUpdate(feedbackDoc, workspaceId) {
  try {
    const result = await classifyFeedback(feedbackDoc.content);

    // Resolve theme names to Theme documents, creating new ones if they don't exist
    const themeRefs = [];
    for (const themeName of result.themes) {
      let theme = await Theme.findOne({ name: themeName, workspaceId });
      if (!theme) {
        theme = await Theme.create({ name: themeName, workspaceId });
      }
      themeRefs.push({ themeId: theme._id, confidence: 0.85 });
    }

    feedbackDoc.sentiment = result.sentiment;
    feedbackDoc.sentimentScore = result.sentimentScore;
    feedbackDoc.themes = themeRefs;
    await feedbackDoc.save();

    return true;
  } catch (err) {
    console.error(`Classification failed for feedback ${feedbackDoc._id}:`, err.message);
    return false;
  }
}

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
      workspaceId: req.user.workspaceId,
      status: 'NEW',
    });

    // Classify asynchronously - don't block the response on it
    classifyAndUpdate(feedback, req.user.workspaceId);

    res.status(201).json({ feedback });
  } catch (err) {
    console.error('Create feedback error:', err);
    res.status(500).json({ error: 'Failed to create feedback.' });
  }
}

// GET /api/feedback - list with pagination + filters
async function getFeedback(req, res) {
  try {
    const { page = 1, limit = 20, channel, sentiment, status, search } = req.query;
    const query = { workspaceId: req.user.workspaceId };
    if (channel) query.channel = channel;
    if (sentiment) query.sentiment = sentiment;
    if (status) query.status = status;
    if (search) query.content = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Feedback.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Feedback.countDocuments(query),
    ]);

    res.json({
      items,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    console.error('Get feedback error:', err);
    res.status(500).json({ error: 'Failed to fetch feedback.' });
  }
}

// PATCH /api/feedback/:id/status
async function updateFeedbackStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['NEW', 'REVIEWED', 'ACTIONED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
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

// POST /api/feedback/:id/reclassify - manual re-classification
async function reclassifyFeedback(req, res) {
  try {
    const { id } = req.params;
    const feedback = await Feedback.findOne({ _id: id, workspaceId: req.user.workspaceId });
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found in your workspace.' });
    }

    const success = await classifyAndUpdate(feedback, req.user.workspaceId);
    if (!success) {
      return res.status(500).json({ error: 'Re-classification failed.' });
    }

    res.json({ feedback });
  } catch (err) {
    console.error('Reclassify error:', err);
    res.status(500).json({ error: 'Failed to reclassify feedback.' });
  }
}

// CSV upload (keep your existing uploadCSV function as-is for now, we'll batch-classify separately)
const { parse } = require('csv-parse/sync');

async function uploadCSV(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    const csvText = req.file.buffer.toString('utf-8');
    let records;
    try {
      records = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });
    } catch (parseErr) {
      return res.status(400).json({ error: 'Could not parse CSV file. Check the format.' });
    }

    const results = { imported: 0, failed: 0, errors: [] };
    const validItems = [];

    records.forEach((row, index) => {
      const rowNumber = index + 2;
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
      const inserted = await Feedback.insertMany(validItems);
      results.imported = inserted.length;

      // Classify each imported item asynchronously (don't block the response)
      inserted.forEach((doc) => classifyAndUpdate(doc, req.user.workspaceId));
    }

    res.json(results);
  } catch (err) {
    console.error('CSV upload error:', err);
    res.status(500).json({ error: 'Failed to process CSV upload.' });
  }
}

// Simulated channel (keep as-is, add classification)
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

async function simulateChannel(req, res) {
  try {
    const { channel } = req.params;
    if (!SIMULATED_CONTENT[channel]) {
      return res.status(400).json({ error: `Unknown channel. Available: ${Object.keys(SIMULATED_CONTENT).join(', ')}` });
    }
    const contentPool = SIMULATED_CONTENT[channel];
    const itemsToCreate = contentPool.map((content, i) => ({
      content,
      channel,
      customerLabel: `Simulated Customer ${Date.now()}-${i}`,
      workspaceId: req.user.workspaceId,
      status: 'NEW',
    }));
    const inserted = await Feedback.insertMany(itemsToCreate);
    inserted.forEach((doc) => classifyAndUpdate(doc, req.user.workspaceId));

    res.json({ message: `Simulated ${itemsToCreate.length} new items from ${channel}.`, imported: itemsToCreate.length });
  } catch (err) {
    console.error('Simulate channel error:', err);
    res.status(500).json({ error: 'Failed to simulate channel.' });
  }
}

const { classifyBatch } = require('../lib/ai');

// Helper: classify a batch of items and update them
async function classifyBatchAndUpdate(docs, workspaceId) {
  try {
    const results = await classifyBatch(docs.map((d) => ({ content: d.content })));

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      const result = results[i];

      const themeRefs = [];
      for (const themeName of result.themes || []) {
        let theme = await Theme.findOne({ name: themeName, workspaceId });
        if (!theme) {
          theme = await Theme.create({ name: themeName, workspaceId });
        }
        themeRefs.push({ themeId: theme._id, confidence: 0.85 });
      }

      doc.sentiment = result.sentiment;
      doc.sentimentScore = result.sentimentScore;
      doc.themes = themeRefs;
      await doc.save();
    }
    return true;
  } catch (err) {
    console.error('Batch classification failed:', err.message);
    return false;
  }
}

// POST /api/feedback/backfill-classify
async function backfillClassify(req, res) {
  try {
    const unclassified = await Feedback.find({
      workspaceId: req.user.workspaceId,
      sentiment: null,
    });

    if (unclassified.length === 0) {
      return res.json({ message: 'No items need classification.', processed: 0 });
    }

    res.json({
      message: `Backfill started for ${unclassified.length} items in batches. This runs in the background.`,
      processed: unclassified.length,
    });

    const BATCH_SIZE = 10;
    for (let i = 0; i < unclassified.length; i += BATCH_SIZE) {
      const batch = unclassified.slice(i, i + BATCH_SIZE);
      await classifyBatchAndUpdate(batch, req.user.workspaceId);
      console.log(`Backfill progress: ${Math.min(i + BATCH_SIZE, unclassified.length)}/${unclassified.length}`);
      await new Promise((resolve) => setTimeout(resolve, 13000)); // ~13s between batches, stays under 5/min
    }

    console.log(`Backfill complete: ${unclassified.length} items classified.`);
  } catch (err) {
    console.error('Backfill error:', err);
  }
}

module.exports = {
  createFeedback,
  getFeedback,
  updateFeedbackStatus,
  reclassifyFeedback,
  uploadCSV,
  simulateChannel,
backfillClassify,
};