// Test script to check login functionality
const mongoose = require('mongoose');
const User = require('./backend/models/User');
require('dotenv').config();

async function testLogin() {
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
    } else {
      console.log('✅ JWT_SECRET is set');
    }

    // Check if any users exist
    const userCount = await User.countDocuments();
    console.log(`\n📊 Users in database: ${userCount}`);

    if (userCount === 0) {
      console.log('\n⚠️  No users found in database!');
      console.log('   You need to sign up first before you can login.');
      console.log('   Go to: http://localhost:3000/signup.html');
    } else {
      console.log('\n✅ Users found in database');
      
      // Show first user (without password)
      const firstUser = await User.findOne().select('-password');
      console.log('\n📝 Sample user:');
      console.log(`   Name: ${firstUser.name}`);
      console.log(`   Email: ${firstUser.email}`);
      console.log(`   Course: ${firstUser.course}`);
      console.log(`   Roll Number: ${firstUser.rollNumber}`);
      
      console.log('\n💡 To login, use:');
      console.log(`   Email: ${firstUser.email}`);
      console.log('   Password: (the password you used during signup)');
    }

    // Test User model methods
    if (userCount > 0) {
      const testUser = await User.findOne();
      if (testUser && typeof testUser.comparePassword === 'function') {
        console.log('\n✅ User.comparePassword method exists');
      } else {
        console.log('\n❌ User.comparePassword method missing');
      }
    }

    console.log('\n✅ Login functionality check complete!');
    console.log('\nTo test login:');
    console.log('1. Make sure server is running: npm start');
    console.log('2. Go to: http://localhost:3000/login.html');
    console.log('3. Use an email that exists in the database');

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

testLogin();


