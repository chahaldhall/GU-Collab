const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (error) {
      console.error('Error creating upload directory:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      // req.user should be available since auth middleware runs before multer
      const userId = req.user?._id?.toString() || req.user?.id?.toString() || 'user';
      const filename = userId + '-' + uniqueSuffix + ext;
      console.log('Multer filename generated:', filename, 'for user:', userId);
      cb(null, filename);
    } catch (error) {
      console.error('Error generating filename:', error);
      // Fallback filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, 'user-' + uniqueSuffix + ext);
    }
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    try {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      const extname = allowedTypes.test(ext);
      const mimetype = file.mimetype && (file.mimetype.startsWith('image/') || allowedTypes.test(file.mimetype));
      
      console.log('File filter check:', {
        originalname: file.originalname,
        extension: ext,
        mimetype: file.mimetype,
        extname: extname,
        mimetypeMatch: mimetype
      });
      
      if (extname && mimetype) {
        return cb(null, true);
      }
      cb(new Error(`Invalid file type. Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed. Received: ${file.mimetype || 'unknown'}`));
    } catch (error) {
      console.error('File filter error:', error);
      cb(new Error('Error validating file: ' + error.message));
    }
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      console.error('User not found for ID:', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Track visit - only for students
    if (user.role === 'student') {
      try {
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
      } catch (visitError) {
        // Log but don't fail the request if visit tracking fails
        console.error('Visit tracking error:', visitError);
        console.error('Visit error details:', {
          message: visitError.message,
          stack: visitError.stack,
          name: visitError.name
        });
      }
    }

    // Convert to plain object to avoid any serialization issues
    const userObj = user.toObject ? user.toObject() : user;
    res.json(userObj);
  } catch (error) {
    console.error('Error in /users/me:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      userId: req.user?._id
    });
    res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update profile
router.put('/me', auth, async (req, res) => {
  try {
    const { name, githubId, linkedinId, bio, skills } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (githubId !== undefined) user.githubId = githubId;
    if (linkedinId !== undefined) user.linkedinId = linkedinId;
    if (bio !== undefined) user.bio = bio;
    if (skills) user.skills = Array.isArray(skills) ? skills : [skills];

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search users by name
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json([]);
    }
    
    const searchTerm = q.trim();
    const users = await User.find({
      name: { $regex: searchTerm, $options: 'i' }
    })
      .select('name email profileImage role course department _id')
      .limit(10)
      .lean();
    
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by ID (for viewing other users' profiles)
// IMPORTANT: This route must come AFTER /search to avoid conflicts
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Don't allow viewing own profile through this endpoint (use /me instead)
    if (userId === req.user._id.toString() || userId === 'me' || userId === 'search') {
      if (userId === 'search') {
        return res.status(404).json({ message: 'Route not found' });
      }
      return res.status(400).json({ message: 'Use /users/me to get your own profile' });
    }
    
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // For students, include visits for calendar display
    // For teachers, exclude visits (they don't have calendar)
    const userObj = user.toObject ? user.toObject() : user;
    if (user.role !== 'student') {
      delete userObj.visits;
    }
    
    res.json(userObj);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload avatar - handle multer errors
router.put('/avatar', auth, (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ message: 'File upload error: ' + err.message });
      }
      // File filter error or other errors
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('========== AVATAR UPLOAD REQUEST ==========');
    console.log('Request method:', req.method);
    console.log('Request user ID:', req.user?._id);
    console.log('Request file:', req.file ? {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    } : 'NO FILE');
    console.log('==========================================');
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ message: 'No file uploaded. Please select an image file.' });
    }

    console.log('File uploaded successfully:', req.file.originalname, req.file.size, req.file.mimetype);

    const user = await User.findById(req.user._id);
    if (!user) {
      // Delete the uploaded file if user not found
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      }
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete old avatar if exists
    if (user.profileImage) {
      const oldAvatarPath = path.join(__dirname, '..', user.profileImage);
      if (fs.existsSync(oldAvatarPath)) {
        try {
          fs.unlinkSync(oldAvatarPath);
          console.log('Deleted old avatar:', oldAvatarPath);
        } catch (unlinkError) {
          console.error('Error deleting old avatar:', unlinkError);
          // Continue even if deletion fails
        }
      }
    }

    // Store relative path from project root (normalize separators)
    // req.file.path is absolute, convert to relative path for storage
    const projectRoot = path.join(__dirname, '..');
    console.log('Project root:', projectRoot);
    console.log('File path (absolute):', req.file.path);
    console.log('File filename:', req.file.filename);
    
    // Calculate relative path
    let relativePath;
    try {
      relativePath = path.relative(projectRoot, req.file.path).replace(/\\/g, '/');
      console.log('Relative path (calculated):', relativePath);
      
      // Ensure it uses forward slashes and starts with uploads/
      if (!relativePath.startsWith('uploads/')) {
        // If relative path doesn't start with uploads/, construct it manually
        relativePath = 'uploads/avatars/' + req.file.filename;
        console.log('Constructed path:', relativePath);
      }
      
      // Verify the file exists at the calculated path
      const fullPath = path.join(projectRoot, relativePath);
      if (fs.existsSync(fullPath)) {
        console.log('✓ File exists at:', fullPath);
      } else {
        console.error('✗ File NOT found at:', fullPath);
        // Try the original file path
        if (fs.existsSync(req.file.path)) {
          console.log('✓ File exists at original path:', req.file.path);
          // Recalculate relative path from original
          relativePath = path.relative(projectRoot, req.file.path).replace(/\\/g, '/');
        }
      }
      
      console.log('Final profile image path to save:', relativePath);
    } catch (pathError) {
      console.error('Error calculating relative path:', pathError);
      // Fallback: use just the filename in uploads/avatars/
      relativePath = 'uploads/avatars/' + req.file.filename;
      console.log('Using fallback path:', relativePath);
    }
    
    // Final verification - ensure path is correct format
    if (!relativePath.startsWith('uploads/avatars/')) {
      relativePath = 'uploads/avatars/' + req.file.filename;
      console.log('Corrected path to:', relativePath);
    }
    
    // CRITICAL: Verify the file actually exists before saving path to database
    const finalFullPath = path.join(projectRoot, relativePath);
    console.log('Verifying file exists at:', finalFullPath);
    console.log('File exists check:', fs.existsSync(finalFullPath));
    
    if (!fs.existsSync(finalFullPath)) {
      console.error('ERROR: Final path does not exist:', finalFullPath);
      console.error('Original multer file path:', req.file.path);
      console.error('Original file exists:', fs.existsSync(req.file.path));
      console.error('Filename:', req.file.filename);
      
      // Try the original multer path
      if (fs.existsSync(req.file.path)) {
        console.log('File exists at multer path, recalculating relative path...');
        // Recalculate from the actual file location
        relativePath = path.relative(projectRoot, req.file.path).replace(/\\/g, '/');
        if (!relativePath.startsWith('uploads/')) {
          relativePath = 'uploads/avatars/' + req.file.filename;
        }
        console.log('Recalculated path:', relativePath);
        
        // Verify again
        const newFullPath = path.join(projectRoot, relativePath);
        if (!fs.existsSync(newFullPath)) {
          throw new Error(`Uploaded file not found. Expected at: ${newFullPath}, Multer saved to: ${req.file.path}`);
        }
      } else {
        // File doesn't exist anywhere - this is a critical error
        throw new Error(`Uploaded file not found at any location. Multer path: ${req.file.path}, Calculated path: ${finalFullPath}`);
      }
    }
    
    console.log('✓ File verified and exists at:', finalFullPath);
    
    // Update only the profileImage field using updateOne
    // This avoids triggering full document validation which can cause issues with conditional fields
    const updateResult = await User.updateOne(
      { _id: req.user._id },
      { profileImage: relativePath }
    );
    
    console.log('Update result:', updateResult);
    
    if (updateResult.matchedCount === 0) {
      throw new Error('User not found for update');
    }
    
    // Fetch updated user for response
    const updatedUser = await User.findById(req.user._id).select('-password');
    
    if (!updatedUser) {
      throw new Error('Failed to fetch updated user');
    }

    console.log('Avatar uploaded successfully for user:', req.user._id);
    console.log('Stored profileImage path:', updatedUser.profileImage);
    console.log('Expected URL path: /' + updatedUser.profileImage);
    
    // Verify the file can be accessed via the static route
    const testPath = path.join(projectRoot, updatedUser.profileImage);
    if (fs.existsSync(testPath)) {
      console.log('✓ File verified at:', testPath);
      console.log('✓ Should be accessible at: http://localhost:3000/' + updatedUser.profileImage);
    } else {
      console.error('✗ CRITICAL: File not found at stored path after update!');
      console.error('✗ Stored path:', updatedUser.profileImage);
      console.error('✗ Full path checked:', testPath);
      console.error('✗ Original multer path:', req.file.path);
      console.error('✗ Original file exists:', fs.existsSync(req.file.path));
      
      // This should not happen if our verification above worked, but handle it anyway
      // Try to find the file by filename in the avatars directory
      const avatarsDir = path.join(projectRoot, 'uploads', 'avatars');
      if (fs.existsSync(avatarsDir)) {
        const files = fs.readdirSync(avatarsDir);
        const matchingFile = files.find(f => f === req.file.filename);
        if (matchingFile) {
          console.log('✓ Found file by filename:', matchingFile);
          // Update with correct path
          const correctPath = 'uploads/avatars/' + matchingFile;
          await User.updateOne(
            { _id: req.user._id },
            { profileImage: correctPath }
          );
          console.log('✓ Updated database with correct path:', correctPath);
          updatedUser.profileImage = correctPath;
        } else {
          console.error('✗ File not found in avatars directory either!');
          console.error('✗ Available files:', files.slice(0, 5));
        }
      }
    }

    // Return user object with profileImage (matching frontend expectation)
    res.json({ 
      user: {
        profileImage: updatedUser.profileImage,
        name: updatedUser.name,
        _id: updatedUser._id
      },
      profileImage: updatedUser.profileImage // Also include for backward compatibility
    });
  } catch (error) {
    console.error('========== AVATAR UPLOAD ERROR ==========');
    console.error('Error:', error);
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Request file:', req.file);
    console.error('Request user:', req.user?._id);
    console.error('==========================================');
    
    // Delete uploaded file if there was an error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Deleted uploaded file due to error');
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    
    // Always return the actual error message for debugging
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
    res.status(500).json({ 
      message: 'Server error', 
      error: errorMessage,
      errorName: error?.name,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
});

// Test endpoint to check upload directory and verify image access
router.get('/test-upload', auth, async (req, res) => {
  try {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
    const exists = fs.existsSync(uploadDir);
    const files = exists ? fs.readdirSync(uploadDir) : [];
    
    // Get current user's profile image from database (fresh fetch)
    const user = await User.findById(req.user._id).select('profileImage name');
    let userImageExists = false;
    let userImagePath = null;
    let userImageFullPath = null;
    
    if (user && user.profileImage) {
      userImagePath = user.profileImage;
      userImageFullPath = path.join(__dirname, '..', user.profileImage);
      userImageExists = fs.existsSync(userImageFullPath);
    }
    
    // Check if any files match the user's ID
    const userFiles = files.filter(f => f.startsWith(req.user._id.toString()));
    
    // Find the most recent file for this user
    const mostRecentUserFile = userFiles.length > 0 
      ? userFiles.sort().reverse()[0] 
      : null;
    
    res.json({
      uploadDir,
      exists,
      fileCount: files.length,
      files: files.slice(0, 10), // Show first 10 files
      user: req.user._id.toString(),
      userName: user?.name,
      userProfileImage: userImagePath,
      userImageExists: userImageExists,
      userImageFullPath: userImageFullPath,
      userFiles: userFiles, // Files that start with user's ID
      mostRecentUserFile: mostRecentUserFile,
      expectedUrl: userImagePath ? `http://localhost:3000/${userImagePath}` : null,
      testUrl: userImagePath ? `http://localhost:3000/${userImagePath}` : null,
      repairSuggestion: !userImageExists && mostRecentUserFile 
        ? `uploads/avatars/${mostRecentUserFile}` 
        : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Repair endpoint to fix broken image paths
router.post('/repair-avatar', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      return res.status(404).json({ message: 'Upload directory not found' });
    }
    
    const files = fs.readdirSync(uploadDir);
    const userFiles = files.filter(f => f.startsWith(req.user._id.toString()));
    
    if (userFiles.length === 0) {
      // No files found for this user, clear the profileImage
      await User.updateOne(
        { _id: req.user._id },
        { $unset: { profileImage: '' } }
      );
      return res.json({ 
        message: 'No avatar files found. Profile image cleared.',
        cleared: true
      });
    }
    
    // Use the most recent file
    const mostRecentFile = userFiles.sort().reverse()[0];
    const correctPath = 'uploads/avatars/' + mostRecentFile;
    const fullPath = path.join(__dirname, '..', correctPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'File not found even after repair attempt' });
    }
    
    // Update the database with the correct path
    await User.updateOne(
      { _id: req.user._id },
      { profileImage: correctPath }
    );
    
    res.json({
      message: 'Avatar path repaired successfully',
      oldPath: user.profileImage,
      newPath: correctPath,
      file: mostRecentFile,
      url: `http://localhost:3000/${correctPath}`
    });
  } catch (error) {
    console.error('Error repairing avatar:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add completed project
router.post('/completed-projects', auth, async (req, res) => {
  try {
    const { title, description, learnings, githubLink, hackathons } = req.body;
    const user = await User.findById(req.user._id);

    user.completedProjects.push({
      title,
      description,
      learnings,
      githubLink,
      hackathons: Array.isArray(hackathons) ? hackathons : []
    });

    await user.save();
    
    // Track visit for student when adding completed project/hackathon
    const trackVisit = require('../utils/trackVisit');
    trackVisit(req.user._id);
    
    res.json(user.completedProjects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


