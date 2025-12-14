// Utility functions

// Use Render backend URL from config
const getApiBase = () => {
  // Use backend URL from config (set in config.js)
  const backendUrl = window.BACKEND_URL || 'https://your-backend-app.onrender.com';
  return `${backendUrl}/api`;
};

const API_BASE = getApiBase();

// Session timeout: 15 minutes (900000 milliseconds)
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

// Get token from localStorage
function getToken() {
  const token = localStorage.getItem('token');
  const loginTime = localStorage.getItem('loginTime');
  
  // Check if session expired
  if (token && loginTime) {
    const timeSinceLogin = Date.now() - parseInt(loginTime);
    if (timeSinceLogin > SESSION_TIMEOUT) {
      // Session expired - clear everything
      removeToken();
      removeCurrentUser();
      return null;
    }
  }
  
  return token;
}

// Set token in localStorage with timestamp
function setToken(token) {
  localStorage.setItem('token', token);
  localStorage.setItem('loginTime', Date.now().toString());
  localStorage.setItem('lastActivity', Date.now().toString());
  
  // Start activity tracking
  startActivityTracking();
}

// Remove token from localStorage
function removeToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('loginTime');
  localStorage.removeItem('lastActivity');
  stopActivityTracking();
}

// Update last activity time
function updateLastActivity() {
  if (getToken()) {
    localStorage.setItem('lastActivity', Date.now().toString());
  }
}

// Check if session expired due to inactivity
function checkSessionTimeout() {
  const token = getToken();
  const lastActivity = localStorage.getItem('lastActivity');
  
  if (!token || !lastActivity) {
    return false; // No session
  }
  
  const timeSinceActivity = Date.now() - parseInt(lastActivity);
  
  if (timeSinceActivity > SESSION_TIMEOUT) {
    // Session expired due to inactivity
    console.log('Session expired due to inactivity');
    performLogout();
    return true;
  }
  
  return false;
}

// Start activity tracking
let activityCheckInterval = null;
function startActivityTracking() {
  // Clear existing interval
  if (activityCheckInterval) {
    clearInterval(activityCheckInterval);
  }
  
  // Update activity on user interactions
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  events.forEach(event => {
    document.addEventListener(event, updateLastActivity, { passive: true });
  });
  
  // Check session timeout every minute
  activityCheckInterval = setInterval(() => {
    if (checkSessionTimeout()) {
      // Session expired, user will be logged out
      return;
    }
  }, 60000); // Check every minute
}

// Stop activity tracking
function stopActivityTracking() {
  if (activityCheckInterval) {
    clearInterval(activityCheckInterval);
    activityCheckInterval = null;
  }
}

// Logout function
function performLogout(showAlert = true) {
  removeToken();
  removeCurrentUser();
  stopActivityTracking();
  
  // Show message before redirecting (only if called from timeout)
  if (showAlert) {
    alert('Your session has expired due to inactivity. Please login again.');
  }
  window.location.href = 'login.html';
}

// Make logout globally accessible
window.logout = function() {
  performLogout(false); // Silent logout when user clicks logout button
};

// Get current user from localStorage
function getCurrentUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

// Set current user in localStorage
function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

// Remove current user from localStorage
function removeCurrentUser() {
  localStorage.removeItem('user');
}

// API request helper
async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const apiUrl = `${API_BASE}${endpoint}`;
    console.log(`API Request: ${options.method || 'GET'} ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      ...options,
      headers
    });

    console.log(`API Response: ${response.status} ${response.statusText}`);

    // Handle non-JSON responses
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        throw new Error('Invalid response from server');
      }
    } else {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error(text || 'Request failed');
    }

    if (!response.ok) {
      const errorMsg = data.message || data.error || `Request failed with status ${response.status}`;
      console.error('API Error Response:', errorMsg);
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    
    // Handle network errors
    if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      throw new Error('Cannot connect to server. Please check if the backend server is running.');
    }
    
    // If it's already an Error object, re-throw it
    if (error instanceof Error) {
      throw error;
    }
    // Otherwise, wrap it in an Error
    throw new Error(error.message || 'Network error. Please check your connection.');
  }
}

// Check if user is authenticated
function isAuthenticated() {
  return !!getToken();
}

// Redirect to login if not authenticated
function requireAuth() {
  // Check session timeout first
  if (checkSessionTimeout()) {
    return false; // Already logged out
  }
  
  const token = getToken();
  if (!token) {
    console.log('No token found, redirecting to login...');
    window.location.href = 'login.html';
    return false;
  }
  
  // Verify token is not empty
  if (token.trim() === '') {
    console.log('Empty token found, redirecting to login...');
    removeToken();
    removeCurrentUser();
    window.location.href = 'login.html';
    return false;
  }
  
  // Update last activity on page load
  updateLastActivity();
  
  return true;
}

// Format date
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Format time
function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Get avatar HTML - always use first letter (image upload feature removed)
function getAvatarHTML(user, size = 40) {
  const letter = user && user.name ? user.name.charAt(0).toUpperCase() : '?';
  return `<div class="avatar-letter" style="width: ${size}px; height: ${size}px; font-size: ${size * 0.3}px;">${letter}</div>`;
}

// Show notification
function showNotification(message, type = 'info') {
  // Simple notification - can be enhanced with a toast library
  alert(message);
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  // Don't close if clicking on dropdown items (let them handle their own clicks)
  if (e.target.closest('.dropdown-item')) {
    return;
  }
  
  if (!e.target.closest('.dropdown') && !e.target.closest('.user-info')) {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
      dropdown.classList.remove('show');
    });
  }

  if (!e.target.closest('.notification-dropdown') && !e.target.closest('.notification-icon')) {
    document.querySelectorAll('.notification-dropdown').forEach(dropdown => {
      dropdown.classList.remove('show');
    });
  }
});

// Initialize Socket.IO connection
// Use a single module-level variable for the socket instance
let socketInstance = null;

// Initialize Socket.IO connection (this function does NOT call getSocket to avoid recursion)
function initSocket() {
  if (typeof io === 'undefined') {
    console.error('Socket.IO library not loaded - make sure /socket.io/socket.io.js is accessible');
    return null;
  }
  
  // If socket already exists and is connected, return it
  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }
  
  try {
    // Use Render backend URL from config
    const backendUrl = window.BACKEND_URL || 'https://gu-collab.onrender.com';
    const socketUrl = backendUrl;
    
    console.log('🔌 Connecting to Socket.IO server:', socketUrl);
    
    // Create new socket instance with better configuration for Render/Vercel
    socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // Keep trying to reconnect
      timeout: 20000,
      forceNew: false, // Reuse existing connection if available
      upgrade: true, // Allow upgrade from polling to websocket
      rememberUpgrade: true,
      withCredentials: false // Important for cross-origin (Vercel to Render)
    });
    
    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO connected:', socketInstance.id);
    });
    
    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      // Try to reconnect if it wasn't a manual disconnect
      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        socketInstance.connect();
      }
    });
    
    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      console.error('Error type:', error.type);
      console.error('Error description:', error.description);
    });
    
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
    });
    
    socketInstance.on('reconnect_error', (error) => {
      console.error('❌ Socket.IO reconnect error:', error);
    });
    
    socketInstance.on('reconnect_failed', () => {
      console.error('❌ Socket.IO reconnection failed - please refresh the page');
    });
    
    return socketInstance;
  } catch (error) {
    console.error('Error initializing Socket.IO:', error);
    return null;
  }
}

// Get socket instance (this function calls initSocket, but initSocket does NOT call getSocket)
function getSocket() {
  // Only initialize if no socket exists or socket is disconnected
  if (!socketInstance || !socketInstance.connected) {
    socketInstance = initSocket(); // initSocket creates and returns the socket, doesn't call getSocket
  }
  return socketInstance;
}
