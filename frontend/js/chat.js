// Chat JavaScript

let socket = null;
let currentProject = null;
let currentUser = null;
let messages = [];

// Initialize chat
document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;

    currentUser = getCurrentUser();
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userAvatar').innerHTML = getAvatarHTML(currentUser);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');

    if (projectId) {
        await loadProject(projectId);
        setupMembers(); // Setup members first
        await loadMessages(projectId);
        setupMessageInput(); // Setup message input handlers
        // Initialize socket - wait for Socket.IO library to load
        if (typeof io !== 'undefined') {
            initChatSocket(projectId);
        } else {
            // Wait for Socket.IO to load
            const checkSocket = setInterval(() => {
                if (typeof io !== 'undefined') {
                    clearInterval(checkSocket);
                    initChatSocket(projectId);
                }
            }, 100);
            // Stop checking after 5 seconds
            setTimeout(() => clearInterval(checkSocket), 5000);
        }
    }
});

// Load project
async function loadProject(projectId) {
    try {
        currentProject = await apiRequest(`/projects/${projectId}`);
        
        // Verify user is a member or admin
        const userId = String(currentUser.id || currentUser._id);
        const adminId = String(currentProject.admin?._id || currentProject.admin || '');
        const isAdmin = adminId === userId;
        const isMember = currentProject.members && currentProject.members.some(m => {
            const memberId = String(m?._id || m || '');
            return memberId === userId;
        });
        
        if (!isAdmin && !isMember) {
            alert('You must be a team member to access this chat.');
            window.location.href = 'index.html';
            return;
        }
        
        // Update page title
        const titleElement = document.getElementById('projectTitle');
        if (titleElement && currentProject.title) {
            titleElement.textContent = `Chat - ${currentProject.title}`;
        }
    } catch (error) {
        // Check if it's a 403 (forbidden) error
        if (error.message && error.message.includes('Only project members')) {
            alert('You must be a team member to access this chat.');
            window.location.href = 'index.html';
        } else {
            alert('Error loading project: ' + error.message);
            window.location.href = 'index.html';
        }
    }
}

// Load messages
async function loadMessages(projectId) {
    try {
        messages = await apiRequest(`/chat/${projectId}`);
        displayMessages();
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Format time only (like WhatsApp - no date in message)
function formatChatTime(date) {
    if (!date) return 'Just now';
    
    const msgDate = new Date(date);
    const timeStr = msgDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return timeStr;
}

// Get date string for separator
function getDateString(date) {
    if (!date) return '';
    const msgDate = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDateOnly = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
    
    if (msgDateOnly.getTime() === today.getTime()) {
        return 'Today';
    } else if (msgDateOnly.getTime() === yesterday.getTime()) {
        return 'Yesterday';
    } else {
        return msgDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: msgDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
}

// Display messages
function displayMessages() {
    const container = document.getElementById('chatMessages');
    if (messages.length === 0) {
        container.innerHTML = '<div class="loading">No messages yet. Start the conversation!</div>';
        return;
    }
    
    let html = '';
    let lastDate = '';
    
    messages.forEach((msg, index) => {
        const userId = String(msg.userId?._id || msg.userId || '');
        const currentUserId = String(currentUser.id || currentUser._id || '');
        const isOwn = userId === currentUserId;
        const userName = msg.userName || msg.userId?.name || 'Unknown';
        const messageText = escapeHtml(msg.message || '');
        const timestamp = formatChatTime(msg.timestamp);
        
        // Add date separator if date changed
        const currentDate = getDateString(msg.timestamp);
        if (currentDate && currentDate !== lastDate) {
            html += `
                <div class="chat-date-separator">
                    <span>${currentDate}</span>
                </div>
            `;
            lastDate = currentDate;
        }
        
        html += `
            <div class="chat-message ${isOwn ? 'own' : ''}">
                <div class="chat-message-header">
                    ${!isOwn ? `<strong>${escapeHtml(userName)}</strong>` : '<strong>You</strong>'}
                </div>
                <div class="chat-message-text">${messageText}</div>
                <div class="chat-message-time">${timestamp}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    scrollToBottom();
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Scroll to bottom
function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    container.scrollTop = container.scrollHeight;
}

// Setup message input handlers
function setupMessageInput() {
    const input = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    
    if (input && sendButton) {
        // Handle Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        // Handle Send button click
        sendButton.addEventListener('click', () => {
            sendMessage();
        });
    }
}

// Initialize socket for chat (renamed to avoid conflict with utils.js initSocket)
function initChatSocket(projectId) {
    // Wait for Socket.IO to be available
    if (typeof io === 'undefined') {
        console.error('Socket.IO library not loaded');
        // Try again after a short delay
        setTimeout(() => initChatSocket(projectId), 500);
        return;
    }

    // Get the socket instance from utils.js (this calls utils.js initSocket, not this function)
    socket = getSocket();
    if (!socket) {
        console.error('Socket.IO not available');
        // Try again after a short delay
        setTimeout(() => initChatSocket(projectId), 1000);
        return;
    }
    
    // If socket already has listeners for this project, don't add duplicates
    if (socket._chatInitialized && socket._chatProjectId === projectId) {
        console.log('Socket already initialized for this project');
        return;
    }
    
    socket._chatInitialized = true;
    socket._chatProjectId = projectId;

    // Wait for connection and join room
    const joinRoom = () => {
        socket.emit('joinRoom', projectId);
        console.log('Joined room:', projectId);
    };
    
    if (!socket.connected) {
        socket.once('connect', () => {
            joinRoom();
        });
    } else {
        joinRoom();
    }

    // Remove old listeners to prevent duplicates
    socket.off('newMessage');
    socket.off('error');
    
    socket.on('newMessage', (message) => {
        console.log('New message received:', message);
        // Check if message already exists (prevent duplicates)
        const exists = messages.some(m => m._id === message._id);
        if (!exists) {
            messages.push(message);
            displayMessages();
        }
    });
    
    socket.on('error', (error) => {
        console.error('Socket error:', error);
        alert('Chat error: ' + (error.message || 'Connection error'));
    });
    
    // Show connection status
    let statusDiv = document.getElementById('chatStatus');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'chatStatus';
        statusDiv.style.cssText = 'padding: 0.5rem; background: #4CAF50; color: white; text-align: center; font-size: 0.85rem; margin-bottom: 0.5rem; border-radius: 5px;';
        statusDiv.textContent = '🟢 Connected';
        const inputContainer = document.querySelector('.chat-input-container');
        if (inputContainer) {
            inputContainer.insertBefore(statusDiv, inputContainer.firstChild);
        }
    }
    
    socket.on('connect', () => {
        console.log('✅ Socket connected, joining room:', projectId);
        if (statusDiv) {
            statusDiv.style.background = '#4CAF50';
            statusDiv.textContent = '🟢 Connected';
        }
        socket.emit('joinRoom', projectId);
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
        if (statusDiv) {
            statusDiv.style.background = '#f44336';
            statusDiv.textContent = '🔴 Disconnected - Reconnecting...';
        }
    });
}

// Setup members
function setupMembers() {
    if (!currentProject) {
        console.error('Current project not loaded');
        return;
    }
    
    const container = document.getElementById('membersList');
    if (!container) {
        console.error('Members list container not found');
        return;
    }
    
    const adminId = String(currentProject.admin?._id || currentProject.admin || '');
    const members = currentProject.members || [];
    
    if (members.length === 0) {
        container.innerHTML = '<div class="loading" style="padding: 1rem;">No members found</div>';
        return;
    }
    
    container.innerHTML = members.map(member => {
        if (!member) return '';
        
        const memberId = String(member._id || member || '');
        const isAdmin = memberId === adminId;
        const memberName = member.name || 'Unknown';
        const memberEmail = member.email || '';
        
        return `
            <div class="member-item">
                ${getAvatarHTML(member, 40)}
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: bold; color: var(--navy-blue); margin-bottom: 0.25rem;">${escapeHtml(memberName)}</div>
                    ${isAdmin ? '<div style="color: var(--university-orange); font-size: 0.85rem; margin-bottom: 0.25rem;">👑 Admin</div>' : ''}
                    ${memberEmail ? `<div style="color: #666; font-size: 0.8rem; word-break: break-word;">${escapeHtml(memberEmail)}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Send message
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) {
        input.focus();
        return;
    }
    
    if (!socket) {
        // Try to initialize socket
        const projectId = new URLSearchParams(window.location.search).get('projectId');
        if (projectId) {
            initChatSocket(projectId);
            // Wait a bit and try again
            setTimeout(() => sendMessage(), 500);
            return;
        }
        alert('Chat connection not available. Please refresh the page.');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');

    if (!projectId) {
        alert('Project ID not found');
        return;
    }

    // Disable input while sending
    input.disabled = true;
    const sendButton = document.querySelector('.chat-input-container .btn');
    if (sendButton) sendButton.disabled = true;

    try {
        // Check if socket is connected
        if (!socket || !socket.connected) {
            console.log('Socket not connected, attempting to reconnect...');
            initChatSocket(projectId);
            // Wait for connection and retry
            setTimeout(() => {
                if (socket && socket.connected) {
                    sendMessage();
                } else {
                    alert('Chat connection failed. Please refresh the page.');
                    input.disabled = false;
                    if (sendButton) sendButton.disabled = false;
                }
            }, 1500);
            return;
        }

        const userId = currentUser.id || currentUser._id;
        const userName = currentUser.name || 'Unknown';
        
        console.log('Sending message:', { projectId, message, userId, userName });
        
        // Send message
        socket.emit('sendMessage', {
            projectId,
            message,
            userId,
            userName
        });

        // Clear input immediately for better UX
        input.value = '';
        
        console.log('✅ Message sent successfully');
    } catch (error) {
        console.error('❌ Error sending message:', error);
        alert('Failed to send message: ' + (error.message || 'Unknown error'));
    } finally {
        input.disabled = false;
        if (sendButton) sendButton.disabled = false;
        input.focus();
    }
}

// Handle key press (global function for backward compatibility)
window.handleKeyPress = function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
};

// Toggle user dropdown (make globally accessible)
window.toggleUserDropdown = function() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
};

// Logout (make globally accessible)
window.logout = function() {
    if (socket) {
        socket.disconnect();
    }
    removeToken();
    removeCurrentUser();
    window.location.href = 'login.html';
};

