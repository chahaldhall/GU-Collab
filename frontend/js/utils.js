// Utility functions

// Use Render backend URL from config
const getApiBase = () => {
  // Use backend URL from config (set in config.js)
  const backendUrl = window.BACKEND_URL || 'https://your-backend-app.onrender.com';
  return `${backendUrl}/api`;
};

const API_BASE = getApiBase();

// Get token from localStorage
function getToken() {
  return localStorage.getItem('token');
}

// Set token in localStorage
function setToken(token) {
  localStorage.setItem('token', token);
}

// Remove token from localStorage
function removeToken() {
  localStorage.removeItem('token');
}

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
    const backendUrl = window.BACKEND_URL || 'https://your-backend-app.onrender.com';
    const socketUrl = backendUrl;
    
    // Create new socket instance
    socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 20000
    });
    
    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO connected:', socketInstance.id);
    });
    
    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
    });
    
    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
    });
    
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
    });
    
    socketInstance.on('reconnect_error', (error) => {
      console.error('❌ Socket.IO reconnect error:', error);
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
