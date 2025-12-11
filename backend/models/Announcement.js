const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'pdf', 'link'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    name: {
      type: String,
      default: ''
    }
  }],
  deadline: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for active announcements
announcementSchema.index({ isActive: 1, deadline: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);

