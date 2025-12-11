# GUCollab - University Collaboration Platform

A comprehensive collaboration platform for university students to create projects, form teams, and participate in hackathons.

## Features

### 🔐 Authentication
- Login with university email (@geetauniversity.edu.in)
- Signup with course and roll number
- Forgot password with OTP verification (5-minute expiry)

### 🏠 Dashboard
- **All Projects**: Browse all available projects with search and filters
- **My Projects**: View projects you created or joined
- **Hackathons**: View active hackathon team requirements with deadlines

### 👤 Profile
- Edit profile with GitHub, LinkedIn, bio, and skills
- Upload profile picture or use letter avatar
- Activity calendar (GitHub-style contribution graph)
- Completed projects showcase
- View projects created and joined

### 📝 Projects
- Create projects or hackathon team requirements
- Set required members and deadlines
- Tech stack tags
- Request to join teams
- Manage team members (admin only)

### 💬 Real-time Chat
- Socket.IO based team chat
- Room-based messaging per project
- Team members list

### 🔔 Notifications
- Join request notifications
- Request acceptance/rejection
- Member removal notifications
- Chat mentions

## Tech Stack

### Backend
- Node.js + Express
- MongoDB with Mongoose
- Socket.IO for real-time chat
- JWT authentication
- bcrypt for password hashing
- nodemailer for OTP emails

### Frontend
- Vanilla HTML/CSS/JavaScript
- Socket.IO client
- Responsive design

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gucollab
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file:
   ```
   MONGODB_URI=mongodb://localhost:27017/gucollab
   JWT_SECRET=your_jwt_secret_key_here
   PORT=3000
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the server**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
gucollab/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   ├── Request.js
│   │   ├── ResetToken.js
│   │   ├── Chat.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── projects.js
│   │   ├── requests.js
│   │   ├── chat.js
│   │   └── notifications.js
│   └── middleware/
│       └── auth.js
├── frontend/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── utils.js
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── profile.js
│   │   ├── projects.js
│   │   └── chat.js
│   ├── index.html
│   ├── login.html
│   ├── signup.html
│   ├── forgot-password.html
│   ├── profile.html
│   ├── create-project.html
│   ├── project-details.html
│   ├── chat.html
│   └── notifications.html
├── server.js
├── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/signup` - Signup
- `POST /api/auth/forgot` - Send OTP
- `POST /api/auth/reset-password` - Reset password with OTP

### Users
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update profile
- `PUT /api/users/avatar` - Upload avatar
- `POST /api/users/completed-projects` - Add completed project

### Projects
- `POST /api/projects` - Create project
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project (owner only)
- `DELETE /api/projects/:id` - Delete project (owner only)
- `DELETE /api/projects/:id/members/:memberId` - Remove member

### Requests
- `POST /api/requests/send` - Send join request
- `GET /api/requests/my` - Get my requests
- `GET /api/requests/received` - Get received requests
- `PUT /api/requests/accept/:id` - Accept request
- `PUT /api/requests/reject/:id` - Reject request

### Chat
- `GET /api/chat/:projectId` - Get chat messages

### Notifications
- `GET /api/notifications` - Get all notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/unread-count` - Get unread count

## Color Theme

- **Primary (Navy Blue)**: `#0A1A44`
- **Secondary (Orange)**: `#F7941D`
- **Background (Light Grey)**: `#F5F5F7`
- **White**: `#FFFFFF`

## Features in Detail

### Activity Calendar
- Tracks daily visits to the platform
- Displays GitHub-style contribution graph
- Shows activity levels with color coding
- Automatically updates on dashboard load

### Request System
- Students can request to join projects
- Project owners receive notifications
- Accept/reject functionality
- Automatic member addition on acceptance

### Real-time Chat
- Socket.IO powered
- Room-based per project
- Only project members can access
- Auto-scroll to latest messages

## Development Notes

- Email configuration is optional for development (OTP will be logged in console)
- MongoDB connection string can be configured in `.env`
- JWT tokens expire in 7 days
- OTP expires in 5 minutes
- File uploads stored in `uploads/avatars/`

## License

ISC


