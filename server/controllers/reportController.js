const mongoose = require('mongoose');
const Report = require('../models/Report');
const Feedback = require('../models/Feedback');
const Theme = require('../models/Theme');
const { generateReportNarrative } = require('../lib/ai');

// POST /api/reports/generate
async function generateReport(req, res) {
  try {
    const { days = 30 } = req.body;
    const workspaceId = new mongoose.Types.ObjectId(req.user.workspaceId);
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd - days * 24 * 60 * 60 * 1000);

    const periodFeedback = await Feedback.find({
      workspaceId,
      createdAt: { $gte: periodStart, $lte: periodEnd },
    });

    if (periodFeedback.length === 0) {
      return res.status(400).json({ error: 'No feedback in this period to generate a report from.' });
    }

    // Pre-compute stats in code (not AI) - accuracy over hallucination
    const sentimentCounts = { POS: 0, NEU: 0, NEG: 0 };
    periodFeedback.forEach((f) => {
      if (f.sentiment) sentimentCounts[f.sentiment]++;
    });

    const themeCountMap = {};
    periodFeedback.forEach((f) => {
      (f.themes || []).forEach((t) => {
        const id = t.themeId.toString();
        themeCountMap[id] = (themeCountMap[id] || 0) + 1;
      });
    });
    const themeIds = Object.keys(themeCountMap);
    const themeDocs = await Theme.find({ _id: { $in: themeIds } });
    const topThemes = themeDocs
      .map((t) => ({ name: t.name, count: themeCountMap[t._id.toString()] || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Pick a few representative verbatim quotes (mix of negative and positive)
    const negQuotes = periodFeedback.filter((f) => f.sentiment === 'NEG').slice(0, 3).map((f) => f.content);
    const posQuotes = periodFeedback.filter((f) => f.sentiment === 'POS').slice(0, 2).map((f) => f.content);
    const quotes = [...negQuotes, ...posQuotes];

    const periodLabel = `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;

    const stats = {
      periodLabel,
      total: periodFeedback.length,
      sentimentPositive: sentimentCounts.POS,
      sentimentNeutral: sentimentCounts.NEU,
      sentimentNegative: sentimentCounts.NEG,
      topThemes,
      quotes,
    };

    // AI writes narrative around the pre-computed real numbers
    const narrative = await generateReportNarrative(stats);

    const contentJson = {
      ...stats,
      executiveSummary: narrative.executiveSummary,
      recommendedActions: narrative.recommendedActions,
    };

    const report = await Report.create({
      title: `Voice of Customer Report - ${periodLabel}`,
      periodStart,
      periodEnd,
      contentJson,
      workspaceId: req.user.workspaceId,
      generatedBy: req.user.userId,
    });

    res.status(201).json({ report });
  } catch (err) {
    console.error('Generate report error:', err);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
}

// GET /api/reports
async function getReports(req, res) {
  try {
    const reports = await Report.find({ workspaceId: req.user.workspaceId })
      .sort({ createdAt: -1 })
      .select('title periodStart periodEnd createdAt');
    res.json({ reports });
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
}

// GET /api/reports/:id
async function getReportById(req, res) {
  try {
    const report = await Report.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found in your workspace.' });
    }
    res.json({ report });
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ error: 'Failed to fetch report.' });
  }
}

module.exports = { generateReport, getReports, getReportById };