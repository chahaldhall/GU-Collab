// Teacher Dashboard JavaScript

let currentTab = 'all';
let currentUser = null;
let projects = [];
let notifications = [];

// Initialize teacher dashboard
document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;

    currentUser = getCurrentUser();
    if (!currentUser) {
        try {
            console.log('Loading user from API...');
            const user = await apiRequest('/users/me');
            // Ensure user has both id and _id for compatibility
            if (user._id && !user.id) {
                user.id = user._id;
            }
            setCurrentUser(user);
            currentUser = user;
            console.log('User loaded successfully:', user.name);
        } catch (error) {
            console.error('Error loading user:', error);
            // Clear invalid token
            removeToken();
            removeCurrentUser();
            window.location.href = 'login.html';
            return;
        }
    } else {
        // Ensure currentUser has both id and _id for compatibility
        if (currentUser._id && !currentUser.id) {
            currentUser.id = currentUser._id;
            setCurrentUser(currentUser);
        }
        console.log('User loaded from localStorage:', currentUser.name);
    }

    // Check if user is actually a teacher - redirect if not
    if (currentUser.role !== 'teacher') {
        console.log('User is not a teacher, redirecting to student dashboard...');
        window.location.href = 'index.html';
        return;
    }

    // Update navbar
    updateNavbar();
    
    // Check URL params for tab selection
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam === 'announcements') {
        currentTab = 'announcements';
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach((t, index) => {
            if (index === 2) { // Announcements tab is 3rd (index 2)
                t.classList.add('active');
            }
        });
        document.querySelector('.search-container').style.display = 'none';
        await loadAnnouncements();
    } else {
        // Default to "All Projects" for teachers
        currentTab = 'all';
        await loadProjects();
    }
    
    // Load notifications
    await loadNotifications();
    
    // Setup search
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('techFilter').addEventListener('change', handleSearch);
    
    // Setup notification icon - redirect to notifications page
    const notificationIcon = document.getElementById('notificationIcon');
    if (notificationIcon) {
        notificationIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = 'notifications.html';
        });
    }
});

// Update navbar
function updateNavbar() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userAvatar').innerHTML = getAvatarHTML(currentUser);
    }
}

// Toggle user dropdown (make globally accessible)
window.toggleUserDropdown = function() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
};

// Switch tabs
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    // Find and activate the clicked tab
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((t, index) => {
        if ((tab === 'all' && index === 0) || 
            (tab === 'hackathons' && index === 1) ||
            (tab === 'announcements' && index === 2)) {
            t.classList.add('active');
        }
    });
    
    if (tab === 'announcements') {
        document.querySelector('.search-container').style.display = 'none';
        loadAnnouncements();
    } else {
        document.querySelector('.search-container').style.display = 'flex';
        loadProjects();
    }
}

// Load projects
async function loadProjects() {
    const container = document.getElementById('projectsContainer');
    container.innerHTML = '<div class="loading">Loading projects...</div>';

    try {
        let endpoint = '/projects';
        if (currentTab === 'hackathons') {
            endpoint += '?type=Hackathon Team Requirement';
        }
        
        projects = await apiRequest(endpoint);

        if (projects && projects.length > 0) {
            displayProjects(projects);
        } else {
            container.innerHTML = '<div class="loading">No projects found.</div>';
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        container.innerHTML = `<div class="loading" style="color: red;">Error: ${error.message}</div>`;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Display projects (teachers can only view, no join options)
function displayProjects(projectsToShow) {
    const container = document.getElementById('projectsContainer');
    
    if (!projectsToShow || projectsToShow.length === 0) {
        container.innerHTML = '<div class="loading">No projects found</div>';
        return;
    }

    container.innerHTML = projectsToShow.map(project => `
        <div class="card">
            <div class="card-title">${escapeHtml(project.title || 'Untitled')}</div>
            <div class="card-description">${escapeHtml(project.description || 'No description')}</div>
            <div class="card-tags">
                ${(project.techStack || []).map(tech => `<span class="tag">${escapeHtml(tech)}</span>`).join('')}
            </div>
            <div class="card-footer">
                <div>
                    <small style="color: #666;">
                        Created by ${project.admin?.name || 'Unknown'} • 
                        ${(project.members || []).length}/${project.requiredMembers || 0} members
                        ${project.type === 'Hackathon Team Requirement' && project.deadline ? 
                            ` • Deadline: ${formatDate(project.deadline)}` : ''}
                    </small>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-outline" onclick="viewProject('${project._id}')">View Details</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Load announcements
async function loadAnnouncements() {
    const container = document.getElementById('projectsContainer');
    container.innerHTML = '<div class="loading">Loading announcements...</div>';

    try {
        const announcements = await apiRequest('/announcements/all');

        if (announcements && announcements.length > 0) {
            displayAnnouncements(announcements);
        } else {
            container.innerHTML = `
                <div style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; color: var(--navy-blue);">Announcements</h2>
                    <button class="btn btn-primary" onclick="openCreateAnnouncementModal()" style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.2rem;">+</span> Create Announcement
                    </button>
                </div>
                <div class="loading">No announcements found. Create your first announcement!</div>
            `;
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
        container.innerHTML = `
            <div style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
                <h2 style="margin: 0; color: var(--navy-blue);">Announcements</h2>
                <button class="btn btn-primary" onclick="openCreateAnnouncementModal()" style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.2rem;">+</span> Create Announcement
                </button>
            </div>
            <div class="loading" style="color: red;">Error: ${error.message}</div>
        `;
    }
}

// Display announcements
function displayAnnouncements(announcements) {
    const container = document.getElementById('projectsContainer');
    
    if (!announcements || announcements.length === 0) {
        container.innerHTML = '<div class="loading">No announcements found.</div>';
        return;
    }

    let html = `
        <div style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; color: var(--navy-blue);">Announcements</h2>
            <button class="btn btn-primary" onclick="openCreateAnnouncementModal()" style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.2rem;">+</span> Create Announcement
            </button>
        </div>
    `;

    html += announcements.map(announcement => {
        const now = new Date();
        const deadline = announcement.deadline ? new Date(announcement.deadline) : null;
        const isExpired = deadline && deadline < now;
        const isActive = announcement.isActive && !isExpired;
        
        let attachmentsHTML = '';
        if (announcement.attachments && announcement.attachments.length > 0) {
            attachmentsHTML = '<div style="margin-top: 1rem;"><strong>Attachments:</strong><div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">';
            announcement.attachments.forEach(attachment => {
                if (attachment.type === 'image') {
                    attachmentsHTML += `<a href="${attachment.url}" target="_blank" class="btn btn-outline" style="padding: 0.5rem;">📷 ${attachment.name || 'Image'}</a>`;
                } else if (attachment.type === 'pdf') {
                    attachmentsHTML += `<a href="${attachment.url}" target="_blank" class="btn btn-outline" style="padding: 0.5rem;">📄 ${attachment.name || 'PDF'}</a>`;
                } else if (attachment.type === 'link') {
                    attachmentsHTML += `<a href="${attachment.url}" target="_blank" class="btn btn-outline" style="padding: 0.5rem;">🔗 ${attachment.name || attachment.url}</a>`;
                }
            });
            attachmentsHTML += '</div></div>';
        }
        
        let actionsHTML = '';
        const authorId = String(announcement.author?._id || announcement.author || '');
        const userId = String(currentUser.id || currentUser._id);
        const isAuthor = authorId === userId;
        
        if (isAuthor) {
            actionsHTML = `
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button class="btn btn-outline" onclick="editAnnouncement('${announcement._id}')">Edit</button>
                    <button class="btn btn-outline" onclick="toggleAnnouncement('${announcement._id}', ${announcement.isActive})" style="background-color: ${announcement.isActive ? '#28a745' : '#6c757d'}; color: white;">
                        ${announcement.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn btn-outline" onclick="deleteAnnouncement('${announcement._id}')" style="background-color: #dc3545; color: white;">Delete</button>
                </div>
            `;
        }
        
        return `
            <div class="card" style="margin-bottom: 1.5rem; ${!isActive ? 'opacity: 0.6;' : ''}">
                <div class="card-title">${escapeHtml(announcement.title)}</div>
                <div style="margin-bottom: 0.5rem;">
                    <small style="color: #666;">
                        By ${announcement.author?.name || 'Unknown'} • ${formatDate(announcement.createdAt)}
                        ${deadline ? ` • Deadline: ${formatDate(deadline)}` : ''}
                        ${!isActive ? ' • (Inactive)' : ''}
                    </small>
                </div>
                <div class="card-description" style="-webkit-line-clamp: unset; white-space: pre-wrap;">${escapeHtml(announcement.content)}</div>
                ${attachmentsHTML}
                ${actionsHTML}
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// Setup modal close handlers for announcements
document.addEventListener('DOMContentLoaded', () => {
    const createModal = document.getElementById('createAnnouncementModal');
    const editModal = document.getElementById('editAnnouncementModal');
    
    if (createModal) {
        createModal.addEventListener('click', (e) => {
            if (e.target === createModal) {
                closeCreateAnnouncementModal();
            }
        });
    }
    
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                closeEditAnnouncementModal();
            }
        });
    }
});

// Handle search
function handleSearch() {
    // Don't search if we're on announcements tab
    if (currentTab === 'announcements') {
        return;
    }
    
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const techFilter = document.getElementById('techFilter').value;

    let filtered = projects;

    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm)
        );
    }

    if (techFilter) {
        filtered = filtered.filter(p => 
            p.techStack.includes(techFilter)
        );
    }

    displayProjects(filtered);
}

// View project details
function viewProject(projectId) {
    window.location.href = `project-details.html?id=${projectId}`;
}

// Load notifications
async function loadNotifications() {
    try {
        notifications = await apiRequest('/notifications');
        const unreadCount = notifications.filter(n => !n.read).length;
        
        const badge = document.getElementById('notificationBadge');
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }

        updateNotificationDropdown();
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Update notification dropdown
function updateNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
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
        }
    } catch (error) {
        console.error('Error handling notification click:', error);
    }
}

// Announcement Management Functions
let announcementLinks = [];

// Open create announcement modal
window.openCreateAnnouncementModal = function() {
    document.getElementById('announcementTitle').value = '';
    document.getElementById('announcementContent').value = '';
    document.getElementById('announcementDeadline').value = '';
    document.getElementById('announcementFiles').value = '';
    announcementLinks = [];
    updateLinksDisplay();
    document.getElementById('createAnnouncementModal').classList.add('show');
};

// Close create announcement modal
window.closeCreateAnnouncementModal = function() {
    document.getElementById('createAnnouncementModal').classList.remove('show');
};

// Add link to announcement
window.addAnnouncementLink = function() {
    const isEditMode = document.getElementById('editAnnouncementModal').classList.contains('show');
    const linkUrlInput = isEditMode ? document.getElementById('editLinkUrl') : document.getElementById('linkUrl');
    const linkNameInput = isEditMode ? document.getElementById('editLinkName') : document.getElementById('linkName');
    
    const linkUrl = linkUrlInput.value.trim();
    const linkName = linkNameInput.value.trim();
    
    if (!linkUrl) {
        alert('Please enter a URL');
        return;
    }
    
    announcementLinks.push({
        url: linkUrl,
        name: linkName || linkUrl
    });
    
    linkUrlInput.value = '';
    linkNameInput.value = '';
    
    if (isEditMode) {
        updateEditLinksDisplay();
    } else {
        updateLinksDisplay();
    }
};

// Remove link from announcement
window.removeAnnouncementLink = function(index) {
    announcementLinks.splice(index, 1);
    updateLinksDisplay();
};

// Update links display
function updateLinksDisplay() {
    const container = document.getElementById('linksContainer');
    if (announcementLinks.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No links added</p>';
    } else {
        container.innerHTML = announcementLinks.map((link, index) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--light-grey); border-radius: 5px; margin-bottom: 0.5rem;">
                <div>
                    <strong>${escapeHtml(link.name)}</strong><br>
                    <small style="color: #666;">${escapeHtml(link.url)}</small>
                </div>
                <button type="button" class="btn btn-outline" onclick="removeAnnouncementLink(${index})" style="padding: 0.25rem 0.75rem;">Remove</button>
            </div>
        `).join('');
    }
}

// Create announcement
window.createAnnouncement = async function() {
    const title = document.getElementById('announcementTitle').value.trim();
    const content = document.getElementById('announcementContent').value.trim();
    const deadline = document.getElementById('announcementDeadline').value;
    const files = document.getElementById('announcementFiles').files;
    
    if (!title || !content) {
        alert('Please fill in title and content');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        if (deadline) {
            formData.append('deadline', deadline);
        }
        if (announcementLinks.length > 0) {
            formData.append('links', JSON.stringify(announcementLinks));
        }
        
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                formData.append('attachments', files[i]);
            }
        }
        
        const token = getToken();
        const apiBase = API_BASE || '/api';
        const response = await fetch(`${apiBase}/announcements`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to create announcement' }));
            throw new Error(errorData.message || 'Failed to create announcement');
        }
        
        closeCreateAnnouncementModal();
        await loadAnnouncements();
    } catch (error) {
        alert('Error creating announcement: ' + error.message);
    }
}

// Edit announcement
window.editAnnouncement = async function(announcementId) {
    try {
        const announcements = await apiRequest(`/announcements/all`);
        const ann = announcements.find(a => String(a._id) === String(announcementId));
        
        if (!ann) {
            alert('Announcement not found');
            return;
        }
        
        document.getElementById('editAnnouncementId').value = announcementId;
        document.getElementById('editAnnouncementTitle').value = ann.title;
        document.getElementById('editAnnouncementContent').value = ann.content;
        document.getElementById('editAnnouncementDeadline').value = ann.deadline ? new Date(ann.deadline).toISOString().slice(0, 16) : '';
        announcementLinks = (ann.attachments || []).filter(a => a.type === 'link').map(a => ({ url: a.url, name: a.name || a.url }));
        updateEditLinksDisplay();
        document.getElementById('editAnnouncementModal').classList.add('show');
    } catch (error) {
        alert('Error loading announcement: ' + error.message);
    }
};

// Close edit announcement modal
window.closeEditAnnouncementModal = function() {
    document.getElementById('editAnnouncementModal').classList.remove('show');
};

// Update edit links display
function updateEditLinksDisplay() {
    const container = document.getElementById('editLinksContainer');
    if (announcementLinks.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No links added</p>';
    } else {
        container.innerHTML = announcementLinks.map((link, index) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--light-grey); border-radius: 5px; margin-bottom: 0.5rem;">
                <div>
                    <strong>${escapeHtml(link.name)}</strong><br>
                    <small style="color: #666;">${escapeHtml(link.url)}</small>
                </div>
                <button type="button" class="btn btn-outline" onclick="removeAnnouncementLink(${index}); updateEditLinksDisplay();" style="padding: 0.25rem 0.75rem;">Remove</button>
            </div>
        `).join('');
    }
}

// Update announcement
window.updateAnnouncement = async function() {
    const announcementId = document.getElementById('editAnnouncementId').value;
    const title = document.getElementById('editAnnouncementTitle').value.trim();
    const content = document.getElementById('editAnnouncementContent').value.trim();
    const deadline = document.getElementById('editAnnouncementDeadline').value;
    const files = document.getElementById('editAnnouncementFiles').files;
    
    if (!title || !content) {
        alert('Please fill in title and content');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        if (deadline) {
            formData.append('deadline', deadline);
        }
        if (announcementLinks.length > 0) {
            formData.append('links', JSON.stringify(announcementLinks));
        }
        
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                formData.append('attachments', files[i]);
            }
        }
        
        const token = getToken();
        const apiBase = API_BASE || '/api';
        const response = await fetch(`${apiBase}/announcements/${announcementId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to update announcement' }));
            throw new Error(errorData.message || 'Failed to update announcement');
        }
        
        closeEditAnnouncementModal();
        await loadAnnouncements();
    } catch (error) {
        alert('Error updating announcement: ' + error.message);
    }
}

// Toggle announcement active status
window.toggleAnnouncement = async function(announcementId, currentStatus) {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this announcement?`)) {
        return;
    }
    
    try {
        await apiRequest(`/announcements/${announcementId}/toggle`, {
            method: 'PUT'
        });
        await loadAnnouncements();
    } catch (error) {
        alert('Error toggling announcement: ' + error.message);
    }
};

// Delete announcement
window.deleteAnnouncement = async function(announcementId) {
    if (!confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
        return;
    }
    
    try {
        await apiRequest(`/announcements/${announcementId}`, {
            method: 'DELETE'
        });
        await loadAnnouncements();
    } catch (error) {
        alert('Error deleting announcement: ' + error.message);
    }
};

// Logout
window.logout = function() {
    removeToken();
    removeCurrentUser();
    window.location.href = 'login.html';
};

