const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ResetToken = require('../models/ResetToken');
const nodemailer = require('nodemailer');
const router = express.Router();

// Email transporter (configure with your email)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate JWT token
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
  if (!secret || secret === 'your_jwt_secret_key_here') {
    console.warn('⚠️  WARNING: Using default JWT_SECRET. Please set JWT_SECRET in .env file for production!');
  }
  
  try {
    return jwt.sign({ userId: userId.toString() }, secret, {
      expiresIn: '7d'
    });
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Failed to generate token');
  }
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user (case-insensitive email search)
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Validate role if provided
    if (role && user.role !== role) {
      return res.status(401).json({ message: `Invalid credentials for ${role}. Please select the correct role.` });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Track visit (ensure visits array exists)
    try {
      const today = new Date().toISOString().split('T')[0];
      if (!user.visits || !Array.isArray(user.visits)) {
        user.visits = [];
      }
      
      const visitIndex = user.visits.findIndex(v => v.date === today);
      if (visitIndex >= 0) {
        user.visits[visitIndex].count += 1;
      } else {
        user.visits.push({ date: today, count: 1 });
      }
      await user.save();
    } catch (visitError) {
      // Log but don't fail login if visit tracking fails
      console.error('Visit tracking error:', visitError);
    }

    // Generate token
    const token = generateToken(user._id);
    
    if (!token) {
      console.error('Token generation failed');
      return res.status(500).json({ message: 'Failed to generate authentication token' });
    }
    
    const userResponse = {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      course: user.course,
      rollNumber: user.rollNumber,
      department: user.department,
      profileImage: user.profileImage || null
    };
    
    console.log('Login successful for:', user.email);
    
    res.json({
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, role, course, rollNumber, department, password, confirmPassword } = req.body;

    // Validate basic fields
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Only allow student registration through public signup
    if (!role || role !== 'student') {
      return res.status(403).json({ message: 'Teacher registration is not available. Teachers must be added by the administrator. Please contact your administrator for access.' });
    }

    // Validate student-specific fields
    if (!course || !rollNumber) {
      return res.status(400).json({ message: 'Please fill all required fields (Course and Roll Number)' });
    }

    // Validate password match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Validate email domain
    if (!/^[^\s@]+@geetauniversity\.edu\.in$/.test(email)) {
      return res.status(400).json({ message: 'Email must be from geetauniversity.edu.in domain' });
    }

    // Check for existing user by email
    const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Check for existing roll number (only for students)
    if (role === 'student' && rollNumber) {
      const existingUserByRoll = await User.findOne({ rollNumber: rollNumber.trim() });
      if (existingUserByRoll) {
        return res.status(400).json({ message: 'Roll number already registered' });
      }
    }

    // ✅ Try to send welcome email (optional - won't block signup if it fails)
    // Email sending is optional - account will be created even if email fails
    let emailSent = false;
    let emailError = null;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        // Send welcome email
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email.toLowerCase().trim(),
          subject: 'Welcome to GUCollab - Account Created Successfully!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f7;">
              <div style="background-color: #0A1A44; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">Welcome to GUCollab!</h1>
              </div>
              <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px;">
                <p style="font-size: 16px; color: #333;">Hello <strong>${name}</strong>,</p>
                <p style="font-size: 16px; color: #333;">Your account has been successfully created on GUCollab!</p>
                
                <div style="background-color: #F5F5F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                  <p style="margin: 5px 0;"><strong>Course:</strong> ${course}</p>
                  <p style="margin: 5px 0;"><strong>Roll Number:</strong> ${rollNumber}</p>
                </div>
                
                <p style="font-size: 16px; color: #333;">You can now:</p>
                <ul style="font-size: 16px; color: #333;">
                  <li>Create and join projects</li>
                  <li>Participate in hackathons</li>
                  <li>Connect with other students</li>
                  <li>Showcase your completed projects</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || 'https://gu-collab.vercel.app'}/login.html" 
                     style="background-color: #F7941D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Login to Your Account
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #666; margin-top: 30px;">If you have any questions, feel free to contact us.</p>
                <p style="font-size: 14px; color: #666; margin: 0;">Best regards,<br>The GUCollab Team</p>
              </div>
              <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          `
        });
        
        emailSent = true;
        console.log(`✅ Welcome email sent successfully to: ${email}`);
      } catch (emailErr) {
        emailError = emailErr;
        console.error('❌ Failed to send welcome email:', emailErr);
        console.error('⚠️  Account will still be created despite email failure');
        // Don't reject signup - continue with account creation
      }
    } else {
      console.warn('⚠️  Email service not configured (EMAIL_USER or EMAIL_PASS missing). Account will be created without sending welcome email.');
    }

    // ✅ Create user account (regardless of email status)
    // Create new user object
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role,
      password
    };

    // Add student-specific fields
    userData.course = course.trim();
    userData.rollNumber = rollNumber.trim();

    // Create new user
    const user = new User(userData);

    await user.save();

    // Generate token
    const token = generateToken(user._id);
    
    // Prepare user response
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      course: user.course,
      rollNumber: user.rollNumber
    };
    
    console.log(`✅ User account created successfully: ${email}`);
    if (emailSent) {
      console.log(`✅ Welcome email was sent to: ${email}`);
    } else if (emailError) {
      console.warn(`⚠️  Account created but welcome email failed: ${emailError.message}`);
    } else {
      console.warn(`⚠️  Account created but email service not configured`);
    }
    
    res.status(201).json({
      token,
      user: userResponse,
      emailSent: emailSent // Include email status in response
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `${field === 'email' ? 'Email' : field === 'rollNumber' ? 'Roll number' : 'Field'} already exists` 
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    // Generic server error
    res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Forgot Password - Send OTP
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOTP();
    
    // Delete old tokens for this email
    await ResetToken.deleteMany({ email });

    // Create new token
    const resetToken = new ResetToken({
      email,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    });
    await resetToken.save();

    // Send OTP via email (if email is configured)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'GUCollab - Password Reset OTP',
          html: `
            <h2>Password Reset OTP</h2>
            <p>Your OTP for password reset is: <strong>${otp}</strong></p>
            <p>This OTP will expire in 5 minutes.</p>
          `
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
        // Still return success if email fails (for development)
      }
    }

    res.json({ message: 'OTP sent to email', otp: process.env.NODE_ENV === 'development' ? otp : null });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reset Password - Verify OTP and Reset
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Please provide email, OTP, and new password' });
    }

    const resetToken = await ResetToken.findOne({ email, otp });
    if (!resetToken) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (new Date() > resetToken.expiresAt) {
      await ResetToken.deleteOne({ _id: resetToken._id });
      return res.status(400).json({ message: 'OTP has expired' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    // Delete used token
    await ResetToken.deleteOne({ _id: resetToken._id });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

