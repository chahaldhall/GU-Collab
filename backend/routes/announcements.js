const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/announcements';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user._id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image and PDF files are allowed'));
  }
});

// Get all active announcements (visible to all authenticated users)
router.get('/', auth, async (req, res) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      isActive: true,
      $or: [
        { deadline: null },
        { deadline: { $gte: now } }
      ]
    })
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all announcements (for teachers to manage)
router.get('/all', auth, async (req, res) => {
  try {
    // Check if user is a teacher
    const user = await User.findById(req.user._id);
    if (user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can view all announcements' });
    }

    const announcements = await Announcement.find()
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    res.json(announcements);
  } catch (error) {
    console.error('Error fetching all announcements:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create announcement (teachers only)
router.post('/', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    // Check if user is a teacher
    const user = await User.findById(req.user._id);
    if (user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can create announcements' });
    }

    const { title, content, deadline, links } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const attachments = [];

    // Handle uploaded files
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const fileType = file.mimetype.startsWith('image/') ? 'image' : 'pdf';
        attachments.push({
          type: fileType,
          url: `/uploads/announcements/${file.filename}`,
          name: file.originalname
        });
      });
    }

    // Handle links
    if (links) {
      const linksArray = Array.isArray(links) ? links : JSON.parse(links);
      linksArray.forEach(link => {
        if (link.url && link.url.trim()) {
          attachments.push({
            type: 'link',
            url: link.url.trim(),
            name: link.name || link.url.trim()
          });
        }
      });
    }

    const announcement = new Announcement({
      title: title.trim(),
      content: content.trim(),
      author: req.user._id,
      attachments,
      deadline: deadline ? new Date(deadline) : null,
      isActive: true
    });

    await announcement.save();
    await announcement.populate('author', 'name email');

    res.status(201).json(announcement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update announcement (teachers only, author only)
router.put('/:id', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    // Check if user is a teacher
    const user = await User.findById(req.user._id);
    if (user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can update announcements' });
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check if user is the author
    if (announcement.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only update your own announcements' });
    }

    const { title, content, deadline, links } = req.body;

    if (title) announcement.title = title.trim();
    if (content) announcement.content = content.trim();
    if (deadline !== undefined) {
      announcement.deadline = deadline ? new Date(deadline) : null;
    }

    // Handle new attachments
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const fileType = file.mimetype.startsWith('image/') ? 'image' : 'pdf';
        announcement.attachments.push({
          type: fileType,
          url: `/uploads/announcements/${file.filename}`,
          name: file.originalname
        });
      });
    }

    // Handle new links
    if (links) {
      const linksArray = Array.isArray(links) ? links : JSON.parse(links);
      linksArray.forEach(link => {
        if (link.url && link.url.trim()) {
          announcement.attachments.push({
            type: 'link',
            url: link.url.trim(),
            name: link.name || link.url.trim()
          });
        }
      });
    }

    await announcement.save();
    await announcement.populate('author', 'name email');

    res.json(announcement);
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete announcement (teachers only, author only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is a teacher
    const user = await User.findById(req.user._id);
    if (user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can delete announcements' });
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check if user is the author
    if (announcement.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own announcements' });
    }

    // Delete associated files
    announcement.attachments.forEach(attachment => {
      if (attachment.type === 'image' || attachment.type === 'pdf') {
        const filePath = path.join(__dirname, '..', attachment.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });

    await announcement.deleteOne();

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Toggle announcement active status (teachers only, author only)
router.put('/:id/toggle', auth, async (req, res) => {
  try {
    // Check if user is a teacher
    const user = await User.findById(req.user._id);
    if (user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can toggle announcements' });
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check if user is the author
    if (announcement.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only toggle your own announcements' });
    }

    announcement.isActive = !announcement.isActive;
    await announcement.save();

    res.json(announcement);
  } catch (error) {
    console.error('Error toggling announcement:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

