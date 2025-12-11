const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@geetauniversity\.edu\.in$/.test(v);
      },
      message: 'Email must be from geetauniversity.edu.in domain'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['student', 'teacher'],
    default: 'student',
    required: true
  },
  course: {
    type: String,
    required: function() {
      return this.role === 'student';
    }
  },
  rollNumber: {
    type: String,
    required: function() {
      return this.role === 'student';
    },
    unique: true,
    sparse: true // Allows multiple null values
  },
  department: {
    type: String,
    required: function() {
      return this.role === 'teacher';
    }
  },
  profileImage: {
    type: String,
    default: null
  },
  githubId: {
    type: String,
    default: ''
  },
  linkedinId: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  skills: [{
    type: String
  }],
  visits: [{
    date: {
      type: String,
      required: true
    },
    count: {
      type: Number,
      default: 1
    }
  }],
  completedProjects: [{
    title: String,
    description: String,
    learnings: String,
    githubLink: String,
    hackathons: [String],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);


