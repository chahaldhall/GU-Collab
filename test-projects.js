// Test script to check projects functionality
const mongoose = require('mongoose');
const Project = require('./backend/models/Project');
const User = require('./backend/models/User');
require('dotenv').config();

async function testProjects() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gucollab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');

    // Count projects
    const projectCount = await Project.countDocuments();
    console.log(`\n📊 Projects in database: ${projectCount}`);

    if (projectCount === 0) {
      console.log('\n⚠️  No projects found in database!');
      console.log('   Create a project first at: http://localhost:3000/create-project.html');
    } else {
      console.log('\n✅ Projects found in database');
      
      // Show all projects
      const projects = await Project.find()
        .populate('admin', 'name email')
        .populate('members', 'name email')
        .sort({ createdAt: -1 })
        .limit(5);
      
      console.log('\n📝 Recent projects:');
      projects.forEach((project, index) => {
        console.log(`\n${index + 1}. ${project.title}`);
        console.log(`   Type: ${project.type}`);
        console.log(`   Admin: ${project.admin?.name || 'Unknown'} (${project.admin?.email || 'N/A'})`);
        console.log(`   Members: ${(project.members && project.members.length) ? project.members.length : 0}/${project.requiredMembers || 0}`);
        console.log(`   Tech Stack: ${(project.techStack && project.techStack.length > 0) ? project.techStack.join(', ') : 'None'}`);
        console.log(`   Created: ${project.createdAt}`);
      });
    }

    // Count users
    const userCount = await User.countDocuments();
    console.log(`\n👥 Users in database: ${userCount}`);

    console.log('\n✅ Projects check complete!');
    console.log('\nTo test projects:');
    console.log('1. Make sure server is running: npm start');
    console.log('2. Go to: http://localhost:3000');
    console.log('3. Click "All Projects" tab to see all projects');
    console.log('4. Click "My Projects" tab to see your projects');

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

testProjects();

