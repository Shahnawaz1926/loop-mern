const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: {
     type: String,
      required: true
     },
  periodStart: {
     type: Date,
      required: true
     },
  periodEnd: {
     type: Date,
      required: true
     },
  contentJson: {
     type: mongoose.Schema.Types.Mixed,
      required: true 
    },
  workspaceId: {
     type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace', required: true },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);