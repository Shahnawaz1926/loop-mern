const mongoose = require('mongoose');
const Theme = require('../models/Theme');
const Feedback = require('../models/Feedback');

// GET /api/themes - list all themes with feedback counts
async function getThemes(req, res) {
  try {
    const workspaceId = new mongoose.Types.ObjectId(req.user.workspaceId);

    const themeCounts = await Feedback.aggregate([
      { $match: { workspaceId } },
      { $unwind: '$themes' },
      { $group: { _id: '$themes.themeId', count: { $sum: 1 } } },
    ]);

    const countMap = Object.fromEntries(themeCounts.map((t) => [t._id.toString(), t.count]));

    const themes = await Theme.find({ workspaceId: req.user.workspaceId });

    const themesWithCounts = themes
      .map((theme) => ({
        _id: theme._id,
        name: theme.name,
        description: theme.description,
        color: theme.color,
        count: countMap[theme._id.toString()] || 0,
      }))
      .sort((a, b) => b.count - a.count);

    res.json({ themes: themesWithCounts });
  } catch (err) {
    console.error('Get themes error:', err);
    res.status(500).json({ error: 'Failed to fetch themes.' });
  }
}

// GET /api/themes/:id/feedback - drill-down into feedback for a specific theme
async function getThemeFeedback(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const theme = await Theme.findOne({ _id: id, workspaceId: req.user.workspaceId });
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found in your workspace.' });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const query = {
      workspaceId: req.user.workspaceId,
      'themes.themeId': id,
    };

    const [items, total] = await Promise.all([
      Feedback.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Feedback.countDocuments(query),
    ]);

    res.json({
      theme: { id: theme._id, name: theme.name },
      items,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    console.error('Get theme feedback error:', err);
    res.status(500).json({ error: 'Failed to fetch theme feedback.' });
  }
}

// GET /api/themes/trends - volume over time per theme + spike detection
async function getThemeTrends(req, res) {
  try {
    const workspaceId = new mongoose.Types.ObjectId(req.user.workspaceId);
    const now = new Date();
    const currentPeriodStart = new Date(now - 14 * 24 * 60 * 60 * 1000); // last 14 days
    const previousPeriodStart = new Date(now - 28 * 24 * 60 * 60 * 1000); // 14 days before that

    const themes = await Theme.find({ workspaceId: req.user.workspaceId });

    const trends = await Promise.all(
      themes.map(async (theme) => {
        const [currentCount, previousCount] = await Promise.all([
          Feedback.countDocuments({
            workspaceId,
            'themes.themeId': theme._id,
            createdAt: { $gte: currentPeriodStart },
          }),
          Feedback.countDocuments({
            workspaceId,
            'themes.themeId': theme._id,
            createdAt: { $gte: previousPeriodStart, $lt: currentPeriodStart },
          }),
        ]);

        let percentChange = null;
        let isSpike = false;
        if (previousCount > 0) {
          percentChange = Math.round(((currentCount - previousCount) / previousCount) * 100);
          isSpike = percentChange >= 50; // flag themes growing 50%+ period over period
        } else if (currentCount > 0) {
          percentChange = 100;
          isSpike = currentCount >= 3; // new theme with meaningful volume
        }

        return {
          themeId: theme._id,
          name: theme.name,
          currentCount,
          previousCount,
          percentChange,
          isSpike,
        };
      })
    );

    trends.sort((a, b) => b.currentCount - a.currentCount);

    res.json({ trends });
  } catch (err) {
    console.error('Get theme trends error:', err);
    res.status(500).json({ error: 'Failed to fetch theme trends.' });
  }
}

module.exports = { getThemes, getThemeFeedback, getThemeTrends };