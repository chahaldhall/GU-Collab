const express = require('express');
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const Request = require('../models/Request');
const Notification = require('../models/Notification');
const trackVisit = require('../utils/trackVisit');
const router = express.Router();

// Create project
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, techStack, type, requiredMembers, deadline, githubLink } = req.body;

    if (!title || !description || !type || !requiredMembers) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const project = new Project({
      title,
      description,
      techStack: Array.isArray(techStack) ? techStack : [],
      type,
      requiredMembers,
      admin: req.user._id,
      members: [req.user._id],
      deadline: deadline ? new Date(deadline) : null,
      githubLink: githubLink || null
    });

    await project.save();
    await project.populate('admin', 'name email profileImage');
    await project.populate('members', 'name email profileImage');

    // Track visit for student when creating project/hackathon
    await trackVisit(req.user._id);

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all projects (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { type, search, techStack } = req.query;
    const query = {};

    if (type) {
      query.type = type;
    }

    // Filter expired hackathons
    if (type === 'Hackathon Team Requirement') {
      query.deadline = { $gte: new Date() };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (techStack) {
      query.techStack = { $in: Array.isArray(techStack) ? techStack : [techStack] };
    }

    const projects = await Project.find(query)
      .populate('admin', 'name email profileImage')
      .populate('members', 'name email profileImage')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('admin', 'name email profileImage rollNumber course')
      .populate('members', 'name email profileImage rollNumber course');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Track visit for student when viewing project
    await trackVisit(req.user._id);

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update project (owner only)
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project owner can update' });
    }

    const { title, description, techStack, requiredMembers, deadline, githubLink } = req.body;

    if (title) project.title = title;
    if (description) project.description = description;
    if (techStack) project.techStack = Array.isArray(techStack) ? techStack : [];
    if (requiredMembers) project.requiredMembers = requiredMembers;
    if (deadline !== undefined) project.deadline = deadline ? new Date(deadline) : null;
    if (githubLink !== undefined) project.githubLink = githubLink || null;

    await project.save();
    await project.populate('admin', 'name email profileImage');
    await project.populate('members', 'name email profileImage');

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete project (owner only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project owner can delete' });
    }

    await Project.deleteOne({ _id: project._id });
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove member (owner only)
router.delete('/:id/members/:memberId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project owner can remove members' });
    }

    const memberId = req.params.memberId;
    if (memberId === project.admin.toString()) {
      return res.status(400).json({ message: 'Cannot remove project owner' });
    }

    project.members = project.members.filter(
      m => m.toString() !== memberId
    );
    await project.save();

    // Create notification
    const notification = new Notification({
      userId: memberId,
      type: 'member_removed',
      title: 'Removed from Project',
      message: `You have been removed from "${project.title}"`,
      projectId: project._id
    });
    await notification.save();

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


