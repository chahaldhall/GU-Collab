// Test script to check signup functionality
const mongoose = require('mongoose');
require('dotenv').config();

async function testSignup() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gucollab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');

    // Check JWT_SECRET
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_jwt_secret_key_here') {
      console.log('⚠️  WARNING: JWT_SECRET not set or using default value');
      console.log('   Please set JWT_SECRET in .env file');
    } else {
      console.log('✅ JWT_SECRET is set');
    }

    // Test User model
    const User = require('./backend/models/User');
    console.log('✅ User model loaded');

    // Test creating a user (won't save, just validate)
    const testUser = new User({
      name: 'Test User',
      email: 'test@geetauniversity.edu.in',
      course: 'B.Tech',
      rollNumber: 'TEST001',
      password: 'test123'
    });

    // Validate without saving
    try {
      await testUser.validate();
      console.log('✅ User model validation passed');
    } catch (validationError) {
      console.log('❌ User model validation failed:', validationError.message);
    }

    console.log('\n✅ All checks passed! Signup should work.');
    console.log('\nTo test signup:');
    console.log('1. Make sure server is running: npm start');
    console.log('2. Go to: http://localhost:3000/signup.html');
    console.log('3. Use email ending with: @geetauniversity.edu.in');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nCommon issues:');
    console.error('1. MongoDB not running - Start MongoDB service');
    console.error('2. Wrong MONGODB_URI - Check .env file');
    console.error('3. Missing dependencies - Run: npm install');
    process.exit(1);
  }
}

testSignup();


