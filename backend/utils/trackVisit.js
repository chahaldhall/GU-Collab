const User = require('../models/User');

// Track user visit/activity
async function trackVisit(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found for visit tracking:', userId);
      return;
    }

    // Only track visits for students
    if (user.role !== 'student') {
      return;
    }

    // Use UTC date string (YYYY-MM-DD) for consistency
    // This ensures the same date is used regardless of server timezone
    const today = new Date().toISOString().split('T')[0];
    
    if (!user.visits || !Array.isArray(user.visits)) {
      user.visits = [];
    }
    
    const visitIndex = user.visits.findIndex(v => v && v.date === today);
    if (visitIndex >= 0) {
      if (!user.visits[visitIndex].count) {
        user.visits[visitIndex].count = 1;
      } else {
        user.visits[visitIndex].count += 1;
      }
    } else {
      user.visits.push({ date: today, count: 1 });
    }
    
    // Mark visits as modified before saving
    user.markModified('visits');
    await user.save();
  } catch (error) {
    // Log but don't fail the request if visit tracking fails
    console.error('Visit tracking error:', error);
  }
}

module.exports = trackVisit;

