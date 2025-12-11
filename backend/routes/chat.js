const express = require('express');
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');
const Project = require('../models/Project');
const router = express.Router();

// Get chat messages for a project
router.get('/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is admin or a member
    const isAdmin = project.admin && project.admin.toString() === req.user._id.toString();
    const isMember = project.members && project.members.some(m => m.toString() === req.user._id.toString());
    
    if (!isAdmin && !isMember) {
      return res.status(403).json({ message: 'Only project members can view chat' });
    }

    const messages = await Chat.find({ projectId: req.params.projectId })
      .sort({ timestamp: 1 })
      .limit(100);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


