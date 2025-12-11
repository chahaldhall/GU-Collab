// Common Notifications Handler for all pages

let notifications = [];

// Initialize notifications on page load
document.addEventListener('DOMContentLoaded', async () => {
    const notificationIcon = document.getElementById('notificationIcon');
    
    if (!notificationIcon) {
        return; // Notifications not available on this page
    }
    
    // Load notifications to update badge count
    await loadNotifications();
    
    // Setup notification icon click - redirect to notifications page
    notificationIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        // Redirect to notifications page
        window.location.href = 'notifications.html';
    });
});

// Load notifications
async function loadNotifications() {
    try {
        if (!isAuthenticated()) {
            return;
        }
        
        notifications = await apiRequest('/notifications');
        const unreadCount = notifications.filter(n => !n.read).length;
        
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }

        // Update badge only, no dropdown needed
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Update notification dropdown
function updateNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;
    
    const recentNotifications = notifications.slice(0, 5);

    if (recentNotifications.length === 0) {
        dropdown.innerHTML = '<div class="notification-item">No notifications</div>';
        return;
    }

    dropdown.innerHTML = recentNotifications.map(notif => {
        const projectId = notif.projectId?._id || notif.projectId;
        const projectIdStr = projectId ? String(projectId) : '';
        const notificationId = String(notif._id || '');
        
        return `
            <div class="notification-item ${notif.read ? '' : 'unread'}" onclick="handleNotificationClick('${notificationId}', '${projectIdStr}')">
                <strong>${escapeHtml(notif.title || '')}</strong><br>
                <small>${escapeHtml(notif.message || '')}</small>
            </div>
        `;
    }).join('');
}

// Handle notification click
async function handleNotificationClick(notificationId, projectId) {
    try {
        // Mark notification as read
        await apiRequest(`/notifications/${notificationId}/read`, { method: 'PUT' });
        
        // Close dropdown
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
        
        if (projectId) {
            const projectIdStr = String(projectId?._id || projectId || '');
            
            if (projectIdStr && projectIdStr !== 'undefined' && projectIdStr !== 'null') {
                const notification = notifications.find(n => String(n._id) === String(notificationId));
                
                if (notification && (notification.type === 'chat_mention' || notification.message?.toLowerCase().includes('chat') || notification.message?.toLowerCase().includes('message'))) {
                    window.location.href = `chat.html?projectId=${projectIdStr}`;
                } else {
                    window.location.href = `project-details.html?id=${projectIdStr}`;
                }
            }
        } else {
            // If no project ID, redirect to notifications page
            window.location.href = 'notifications.html';
        }
    } catch (error) {
        console.error('Error handling notification click:', error);
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

