const mongoose = require('mongoose');

const themeSchema = new mongoose.Schema({
  name: {
     type: String,
     required: true 
    },
  description: String,
  color: String,
  workspaceId: {
     type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Theme', themeSchema);