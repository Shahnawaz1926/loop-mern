const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const Theme = require('../models/Theme');

async function getSummary(req, res) {
  try {
    const workspaceId = new mongoose.Types.ObjectId(req.user.workspaceId);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      total,
      negativeCount,
      newThisWeek,
      sentimentBreakdown,
      volumeOverTime,
      topThemesRaw,
    ] = await Promise.all([
      Feedback.countDocuments({ workspaceId }),
      Feedback.countDocuments({ workspaceId, sentiment: 'NEG' }),
      Feedback.countDocuments({ workspaceId, createdAt: { $gte: sevenDaysAgo } }),

      Feedback.aggregate([
        { $match: { workspaceId } },
        { $group: { _id: '$sentiment', count: { $sum: 1 } } },
      ]),

      Feedback.aggregate([
        { $match: { workspaceId, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Feedback.aggregate([
        { $match: { workspaceId } },
        { $unwind: '$themes' },
        { $group: { _id: '$themes.themeId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
    ]);

    const themeIds = topThemesRaw.map((t) => t._id);
    const themeDocs = await Theme.find({ _id: { $in: themeIds } });
    const themeMap = Object.fromEntries(themeDocs.map((t) => [t._id.toString(), t.name]));

    const topThemes = topThemesRaw.map((t) => ({
      name: themeMap[t._id?.toString()] || 'Unknown',
      count: t.count,
    }));

    const sentimentData = { POS: 0, NEU: 0, NEG: 0 };
    sentimentBreakdown.forEach((s) => {
      if (s._id && sentimentData.hasOwnProperty(s._id)) {
        sentimentData[s._id] = s.count;
      }
    });

    res.json({
      stats: {
        total,
        negativePercent: total > 0 ? Math.round((negativeCount / total) * 100) : 0,
        newThisWeek,
      },
      sentimentBreakdown: [
        { name: 'Positive', value: sentimentData.POS },
        { name: 'Neutral', value: sentimentData.NEU },
        { name: 'Negative', value: sentimentData.NEG },
      ],
      volumeOverTime: volumeOverTime.map((v) => ({ date: v._id, count: v.count })),
      topThemes,
    });
  } catch (err) {
    console.error('Analytics summary error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
}

module.exports = { getSummary };