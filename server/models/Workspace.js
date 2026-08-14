const mongoose = require('mongoose');

const WorkspaceSchema = new mongoose.Schema(
    {
    name:{
        type: String,
        required:true,
    },
},
    {
        timestamps:true
    },
    
);

module.exports = mongoose.model('workspace', WorkspaceSchema);