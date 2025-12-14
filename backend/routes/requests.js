const express = require('express');
const auth = require('../middleware/auth');
const Request = require('../models/Request');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const router = express.Router();

// Send join request
router.post('/send', auth, async (req, res) => {
  try {
    const { projectId, message } = req.body;

    if (!projectId || !message) {
      return res.status(400).json({ message: 'Project ID and message are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if already a member
    if (project.members.some(m => m.toString() === req.user._id.toString())) {
      return res.status(400).json({ message: 'You are already a member' });
    }

    // Check if request already exists
    const existingRequest = await Request.findOne({
      projectId,
      userId: req.user._id,
      status: 'Pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Request already sent' });
    }

    const request = new Request({
      projectId,
      userId: req.user._id,
      message
    });

    await request.save();
    await request.populate('userId', 'name email profileImage');
    await request.populate('projectId', 'title');

    // Create notification for project owner
    const notification = new Notification({
      userId: project.admin,
      type: 'join_request',
      title: 'New Join Request',
      message: `${req.user.name} requested to join "${project.title}"`,
      projectId: project._id
    });
    await notification.save();

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get my requests
router.get('/my', auth, async (req, res) => {
  try {
    const requests = await Request.find({ userId: req.user._id })
      .populate('projectId', 'title description admin members')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get requests for my projects
router.get('/received', auth, async (req, res) => {
  try {
    const projects = await Project.find({ admin: req.user._id });
    const projectIds = projects.map(p => p._id);

    const requests = await Request.find({
      projectId: { $in: projectIds },
      status: 'Pending'
    })
      .populate('userId', 'name email profileImage rollNumber course')
      .populate('projectId', 'title')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Accept request
router.put('/accept/:id', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('projectId');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const project = request.projectId;
    if (project.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project owner can accept requests' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    // Check if project is full
    if (project.members.length >= project.requiredMembers) {
      return res.status(400).json({ message: 'Project is full' });
    }

    // Add user to members
    if (!project.members.some(m => m.toString() === request.userId.toString())) {
      project.members.push(request.userId);
      await project.save();
    }

    request.status = 'Accepted';
    await request.save();

    // Delete the join_request notification for project admin
    await Notification.deleteMany({
      userId: project.admin,
      type: 'join_request',
      projectId: project._id,
      read: false // Only delete unread notifications
    });

    // Create notification for requester
    const notification = new Notification({
      userId: request.userId,
      type: 'request_accepted',
      title: 'Request Accepted',
      message: `Your request to join "${project.title}" has been accepted`,
      projectId: project._id
    });
    await notification.save();

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject request
router.put('/reject/:id', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('projectId');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const project = request.projectId;
    if (project.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project owner can reject requests' });
    }

    request.status = 'Rejected';
    await request.save();

    // Delete the join_request notification for project admin
    await Notification.deleteMany({
      userId: project.admin,
      type: 'join_request',
      projectId: project._id,
      read: false // Only delete unread notifications
    });

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


