const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  techStack: [{
    type: String
  }],
  type: {
    type: String,
    enum: ['Project', 'Hackathon Team Requirement'],
    required: true
  },
  requiredMembers: {
    type: Number,
    required: true,
    min: 1
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  deadline: {
    type: Date,
    default: null
  },
  githubLink: {
    type: String,
    default: null,
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Cancelled'],
    default: 'Active'
  }
}, {
  timestamps: true
});

// Index for expired hackathons
projectSchema.index({ type: 1, deadline: 1 });

module.exports = mongoose.model('Project', projectSchema);


