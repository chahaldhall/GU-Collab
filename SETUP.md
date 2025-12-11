# GUCollab - Setup Guide

## Prerequisites

Before running the project, make sure you have the following installed:

1. **Node.js** (version 14 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **MongoDB** (Community Edition)
   - Download from: https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas

3. **Git** (optional, for cloning)
   - Download from: https://git-scm.com/

## Step-by-Step Setup

### Step 1: Install Dependencies

Open your terminal/command prompt in the project directory and run:

```bash
npm install
```

This will install all required packages:
- express
- mongoose
- bcryptjs
- jsonwebtoken
- socket.io
- cors
- dotenv
- multer
- nodemailer

### Step 2: Set Up MongoDB

#### Option A: Local MongoDB

1. Start MongoDB service:
   - **Windows**: MongoDB should start automatically as a service
   - **Mac/Linux**: Run `mongod` in terminal or start the service
   - Verify: `mongosh` or `mongo` should connect

2. MongoDB will run on default port: `27017`

#### Option B: MongoDB Atlas (Cloud - Recommended for beginners)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster (free tier available)
4. Get your connection string
5. Whitelist your IP address
6. Create a database user

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory of the project:

```env
MONGODB_URI=mongodb://localhost:27017/gucollab
JWT_SECRET=your_super_secret_jwt_key_here_change_this
PORT=3000
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

**Important Notes:**
- For **MongoDB Atlas**: Replace `MONGODB_URI` with your Atlas connection string
  - Example: `mongodb+srv://username:password@cluster.mongodb.net/gucollab`
- For **JWT_SECRET**: Use a long random string (at least 32 characters)
- **Email settings** are optional for development (OTP will be shown in console if email not configured)

### Step 4: Create Uploads Directory

The project needs a directory for avatar uploads. Create it:

```bash
mkdir uploads
mkdir uploads/avatars
```

Or the server will create it automatically on first upload.

### Step 5: Start the Server

#### Development Mode (with auto-reload):
```bash
npm run dev
```

#### Production Mode:
```bash
npm start
```

You should see:
```
MongoDB connected
Server running on port 3000
```

### Step 6: Access the Application

Open your web browser and navigate to:

```
http://localhost:3000
```

You should see the login page.

## First Time Setup

### Create Your First Account

1. Click on "Sign Up" or go to: `http://localhost:3000/signup.html`

2. Fill in the form:
   - **Name**: Your full name
   - **Email**: Must end with `@geetauniversity.edu.in`
   - **Course**: Select from dropdown (B.Tech, BCA, MCA, etc.)
   - **Roll Number**: Your university roll number
   - **Password**: Choose a secure password
   - **Confirm Password**: Re-enter your password

3. Click "Sign Up"

4. You'll be automatically logged in and redirected to the dashboard

## Troubleshooting

### Issue: "MongoDB connection error"

**Solution:**
- Make sure MongoDB is running
- Check your `MONGODB_URI` in `.env` file
- For Atlas: Verify your connection string and IP whitelist

### Issue: "Port 3000 already in use"

**Solution:**
- Change `PORT` in `.env` to another port (e.g., 3001)
- Or stop the application using port 3000

### Issue: "Cannot find module"

**Solution:**
- Run `npm install` again
- Delete `node_modules` folder and `package-lock.json`, then run `npm install`

### Issue: "Email not sending OTP"

**Solution:**
- This is normal in development mode
- Check the server console - OTP will be displayed there
- To enable email: Configure Gmail App Password in `.env`

### Issue: "Socket.IO connection failed"

**Solution:**
- Make sure the server is running
- Check browser console for errors
- Verify Socket.IO script is loaded: `<script src="/socket.io/socket.io.js"></script>`

## Testing the Application

### Test Flow:

1. **Sign Up** → Create a new account
2. **Login** → Log in with your credentials
3. **Create Project** → Click "+ Create Project" button
4. **View Projects** → Browse in "All Projects" tab
5. **Request to Join** → Click "Request to Join" on a project
6. **Profile** → Click avatar → "My Profile"
7. **Chat** → Join a project and click "Open Chat"

## Development Tips

1. **View Logs**: Check terminal/console for server logs
2. **Database**: Use MongoDB Compass or `mongosh` to view data
3. **Hot Reload**: Use `npm run dev` for automatic server restart
4. **Clear Cache**: Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in `.env`
2. Use a strong `JWT_SECRET`
3. Configure proper email service
4. Use MongoDB Atlas or managed MongoDB
5. Set up proper file storage (AWS S3, etc.)
6. Use environment variables for all sensitive data

## Need Help?

- Check the `README.md` for API documentation
- Review the code comments in the source files
- Check MongoDB and Node.js documentation

---

**Happy Coding! 🚀**


