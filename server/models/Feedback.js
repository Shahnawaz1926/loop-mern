const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  content: { type: String, required: true },
  channel: { type: String, required: true },
  sourceRef: String,
  customerLabel: String,
  sentiment: { type: String, enum: ['POS', 'NEU', 'NEG'], default: null },
  sentimentScore: { type: Number, default: null },
  status: { type: String, enum: ['NEW', 'REVIEWED', 'ACTIONED'], default: 'NEW' },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  themes: [{
    themeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Theme' },
    confidence: { type: Number, default: 1.0 },
  }],
  embedding: { type: [Number], default: undefined },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);