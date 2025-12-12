const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "https://gu-collab.vercel.app" || "*", 
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["*"]
  },
  allowEIO3: true, // Allow Engine.IO v3 clients (older Socket.IO clients)
  transports: ['websocket', 'polling'], // Enable both transports
  pingTimeout: 60000,
  pingInterval: 25000,
  cookie: false // Disable cookies for better cross-origin support
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "https://gu-collab.vercel.app" || "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'frontend')));
// Serve uploaded files with proper headers
// IMPORTANT: This must come before the catch-all route to ensure uploads are served correctly
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // Set CORS headers for images
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    // Cache images for 1 day
    res.set('Cache-Control', 'public, max-age=86400');
  },
  dotfiles: 'allow' // Allow serving files that start with dot
}));

// Explicit route handler for uploads as fallback (static middleware should handle it, but this ensures it works)
app.get('/uploads/*', (req, res, next) => {
  const filePath = path.join(__dirname, req.path);
  console.log('Upload request:', req.path, '->', filePath, 'exists:', fs.existsSync(filePath));
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  
  // If file not found, log for debugging
  console.error('Upload file not found:', req.path, 'Full path:', filePath);
  res.status(404).json({ 
    error: 'File not found', 
    path: req.path,
    fullPath: filePath,
    exists: fs.existsSync(filePath)
  });
});

// Debug route to test image serving
app.get('/test-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', 'avatars', filename);
  const exists = fs.existsSync(filePath);
  
  if (exists) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ 
      error: 'File not found',
      requested: filename,
      path: filePath,
      exists: fs.existsSync(filePath)
    });
  }
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://chahaldhall:%3CChahal_56%3E@cluster0.xh504ls.mongodb.net/UniCollab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected');
  console.log('Database:', mongoose.connection.name);
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  console.error('Make sure MongoDB is running or check your MONGODB_URI in .env file');
});

// Routes
app.use('/api/auth', require('./backend/routes/auth'));
app.use('/api/users', require('./backend/routes/users'));
app.use('/api/projects', require('./backend/routes/projects'));
app.use('/api/requests', require('./backend/routes/requests'));
app.use('/api/chat', require('./backend/routes/chat'));
app.use('/api/notifications', require('./backend/routes/notifications'));
app.use('/api/announcements', require('./backend/routes/announcements'));

// Serve frontend static files (HTML, CSS, JS, images, etc.)
// This must come before the catch-all route
app.get('*', (req, res, next) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  // Don't interfere with uploads - they're handled by static middleware above
  if (req.path.startsWith('/uploads')) {
    return next();
  }
  
  // Try to serve the requested file first
  const filePath = path.join(__dirname, 'frontend', req.path);
  
  // Check if file exists
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  
  // If file doesn't exist, serve index.html for SPA routing
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Socket.IO for real-time chat
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', (projectId) => {
    if (!projectId) {
      console.error('No projectId provided for joinRoom');
      return;
    }
    socket.join(`room_${projectId}`);
    console.log(`User ${socket.id} joined room_${projectId}`);
  });

  socket.on('sendMessage', async (data) => {
    try {
      const { projectId, message, userId, userName } = data;
      
      if (!projectId || !message || !userId || !userName) {
        console.error('Missing required fields in sendMessage:', data);
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      const Chat = require('./backend/models/Chat');
      const Project = require('./backend/models/Project');
      
      // Verify project exists and user is a member
      const project = await Project.findById(projectId);
      if (!project) {
        socket.emit('error', { message: 'Project not found' });
        return;
      }

      // Check if user is admin or member
      const isAdmin = project.admin && project.admin.toString() === userId.toString();
      const isMember = project.members && project.members.some(m => m.toString() === userId.toString());
      if (!isAdmin && !isMember) {
        socket.emit('error', { message: 'Only project members can send messages' });
        return;
      }
      
      const chatMessage = new Chat({
        projectId,
        userId,
        userName,
        message,
        timestamp: new Date()
      });
      
      await chatMessage.save();
      
      // Create notifications for all project members except the sender
      const Notification = require('./backend/models/Notification');
      
      // Get all project members including admin
      const allMembers = new Set();
      if (project.admin) {
        allMembers.add(project.admin.toString());
      }
      if (project.members && project.members.length > 0) {
        project.members.forEach(member => {
          if (member) {
            allMembers.add(member.toString());
          }
        });
      }
      
      // Convert to array and filter out the sender
      const membersToNotify = Array.from(allMembers)
        .filter(memberId => memberId !== userId.toString());
      
      console.log(`Creating notifications for ${membersToNotify.length} members (excluding sender ${userId})`);
      
      // Create notifications for all members except the sender
      const notificationPromises = membersToNotify.map(async (memberId) => {
        try {
          // Check if user is currently in the chat room (to avoid duplicate notifications)
          const room = io.sockets.adapter.rooms.get(`room_${projectId}`);
          const isInRoom = room && Array.from(room).length > 0;
          
          // Create notification for all members (they can dismiss if they're viewing chat)
          const notification = new Notification({
            userId: memberId,
            type: 'new_message',
            title: 'New Message',
            message: `${userName} sent a message in "${project.title}"`,
            projectId: project._id
          });
          await notification.save();
          console.log(`✅ Notification created for user ${memberId}`);
        } catch (error) {
          console.error(`❌ Error creating notification for user ${memberId}:`, error);
        }
      });
      
      await Promise.all(notificationPromises);
      console.log(`✅ All notifications created for project ${projectId}`);
      
      // Emit to all users in the room
      io.to(`room_${projectId}`).emit('newMessage', {
        _id: chatMessage._id,
        userId,
        userName,
        message,
        timestamp: chatMessage.timestamp
      });
      
      // Emit notification update to all project members
      membersToNotify.forEach(memberId => {
        io.emit('notification', { userId: memberId.toString() });
      });
      
      console.log(`✅ Message sent in room_${projectId} by ${userName}`);
    } catch (error) {
      console.error('Error in sendMessage:', error);
      socket.emit('error', { message: 'Failed to send message', error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

