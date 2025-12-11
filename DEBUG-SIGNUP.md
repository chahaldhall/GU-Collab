# Debug Signup Error - Step by Step

## ✅ Good News!

The test script shows everything is configured correctly:
- ✅ MongoDB connected
- ✅ JWT_SECRET is set
- ✅ User model is working

---

## What to Check Now

### 1. Is the Server Running?

**Check your terminal where you ran `npm start`**

You should see:
```
MongoDB connected
Database: gucollab
Server running on port 3000
```

**If server is NOT running:**
```bash
npm start
```

---

### 2. What Error Do You See?

**In the Browser:**
- Open signup page: http://localhost:3000/signup.html
- Fill the form
- Click "Sign Up"
- **What error message appears?**

**Common Error Messages:**

| Error Message | What It Means | How to Fix |
|--------------|---------------|------------|
| "Server error" | Backend issue | Check server terminal |
| "Email must be from..." | Wrong email domain | Use @geetauniversity.edu.in |
| "User already exists" | Email/roll number taken | Use different credentials |
| "Please fill all fields" | Missing field | Fill all fields |
| "Passwords do not match" | Password mismatch | Make sure passwords match |

---

### 3. Check Browser Console

1. Press **F12** in browser
2. Go to **Console** tab
3. Try signing up
4. **Copy any red error messages**

---

### 4. Check Network Request

1. Press **F12** in browser
2. Go to **Network** tab
3. Try signing up
4. Find `/api/auth/signup` request
5. Click on it
6. Check **Response** tab
7. **Copy the error message**

---

### 5. Check Server Terminal

Look at the terminal where server is running.

**If you see errors like:**
- `MongoDB connection error` → MongoDB not running
- `JWT_SECRET is not defined` → Check .env file
- `ValidationError` → Check form data

---

## Quick Test

Try signing up with this test data:

- **Name:** Test User
- **Email:** test@geetauniversity.edu.in
- **Course:** B.Tech
- **Roll Number:** TEST001
- **Password:** test123
- **Confirm Password:** test123

**Does it work?** If yes, the issue is with your data. If no, check the error message.

---

## Most Common Issues

### Issue 1: Email Format
❌ Wrong: `test@gmail.com`  
✅ Correct: `test@geetauniversity.edu.in`

### Issue 2: Duplicate User
- Email or roll number already exists
- Use different email/roll number
- Or delete from database

### Issue 3: Server Not Running
- Make sure `npm start` is running
- Check terminal for errors

### Issue 4: MongoDB Not Connected
- Start MongoDB service
- Or use MongoDB Atlas
- Check `.env` file

---

## Need More Help?

**Share with me:**
1. The exact error message you see
2. What appears in browser console (F12)
3. What appears in server terminal
4. The data you're trying to sign up with

This will help me identify the exact issue!


