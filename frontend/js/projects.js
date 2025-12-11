// Projects JavaScript

let currentProject = null;
let currentUser = null;
let requests = [];

// Initialize project details page
document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;

    currentUser = getCurrentUser();
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userAvatar').innerHTML = getAvatarHTML(currentUser);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    const manage = urlParams.get('manage');

    if (projectId) {
        await loadProjectDetails(projectId);
        if (manage === 'true' && currentProject && currentProject.admin._id === currentUser.id) {
            await loadRequests();
        }
    }

    setupRequestForm();
});

// Load project details
async function loadProjectDetails(projectId) {
    try {
        // Ensure projectId is a string (handle both string and object IDs)
        const id = String(projectId?._id || projectId || '');
        if (!id || id === 'undefined' || id === 'null') {
            throw new Error('Invalid project ID');
        }
        
        currentProject = await apiRequest(`/projects/${id}`);
        displayProjectDetails();
    } catch (error) {
        console.error('Error loading project details:', error);
        const container = document.getElementById('projectDetails');
        if (container) {
            container.innerHTML = 
                `<div class="loading" style="color: red;">Error: ${error.message}</div>`;
        }
    }
}

// Display project details
function displayProjectDetails() {
    const container = document.getElementById('projectDetails');
    const userId = String(currentUser.id || currentUser._id);
    const adminId = String(currentProject.admin?._id || currentProject.admin || '');
    const isAdmin = adminId === userId;
    const isMember = (currentProject.members || []).some(m => {
        const memberId = String(m?._id || m || '');
        return memberId === userId;
    });
    const currentMembers = (currentProject.members || []).length;
    const requiredMembers = currentProject.requiredMembers || 0;
    const isFull = currentMembers >= requiredMembers;
    const canJoin = !isMember && !isFull;

    // Check if user is a teacher
    const isTeacher = currentUser.role === 'teacher';
    
    let actionsHTML = '';
    if (isAdmin) {
        actionsHTML = `
            <button class="btn btn-primary" onclick="window.location.href='chat.html?projectId=${String(currentProject._id || currentProject.id || '')}'">Open Chat</button>
            <button class="btn btn-secondary" onclick="loadRequests(); document.getElementById('manageSection').style.display='block';">Manage Team</button>
            <button class="btn btn-outline" onclick="editProject()">Edit Project</button>
            <button class="btn btn-outline" onclick="deleteProject()" style="background-color: #dc3545; color: white; border-color: #dc3545;">Delete Project</button>
        `;
    } else if (isMember) {
        actionsHTML = `
            <button class="btn btn-primary" onclick="window.location.href='chat.html?projectId=${String(currentProject._id || currentProject.id || '')}'">Open Chat</button>
            <button class="btn btn-outline" onclick="leaveProject()">Leave Team</button>
        `;
    } else if (isTeacher) {
        // Teachers can only view, no join options
        actionsHTML = '';
    } else if (canJoin) {
        actionsHTML = `
            <button class="btn btn-primary" onclick="openRequestModal()">Request to Join</button>
        `;
    } else if (isFull) {
        actionsHTML = `
            <button class="btn btn-outline" disabled style="opacity: 0.6;">Project Full (${currentMembers}/${requiredMembers} members)</button>
        `;
    } else {
        actionsHTML = `
            <button class="btn btn-outline" disabled>Cannot Join</button>
        `;
    }

    container.innerHTML = `
        <div class="card">
            <h1 class="card-title">${currentProject.title}</h1>
            <div style="margin-bottom: 1rem;">
                <span class="tag" style="background-color: ${currentProject.type === 'Hackathon Team Requirement' ? 'var(--university-orange)' : 'var(--light-grey)'};">
                    ${currentProject.type}
                </span>
            </div>
            <p class="card-description" style="-webkit-line-clamp: unset;">${currentProject.description}</p>
            <div class="card-tags">
                ${currentProject.techStack.map(tech => `<span class="tag">${tech}</span>`).join('')}
            </div>
            <div style="margin: 1rem 0;">
                <p><strong>Created by:</strong> ${currentProject.admin.name}</p>
                <p><strong>Members:</strong> ${currentProject.members.length}/${currentProject.requiredMembers}</p>
                ${currentProject.deadline ? `<p><strong>Deadline:</strong> ${formatDate(currentProject.deadline)}</p>` : ''}
                <p><strong>Created:</strong> ${formatDate(currentProject.createdAt)}</p>
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                ${actionsHTML}
            </div>
        </div>

        <div class="card">
            <h3 class="card-title">Team Members</h3>
            <div id="membersList">
                ${currentProject.members.map(member => `
                    <div class="member-item">
                        ${getAvatarHTML(member, 30)}
                        <div>
                            <strong>${member.name}</strong>
                            ${(member._id || member) === (currentProject.admin._id || currentProject.admin) ? '<span style="color: var(--university-orange);">(Admin)</span>' : ''}
                            <br>
                            <small style="color: #666;">${member.email}</small>
                        </div>
                        ${isAdmin && (member._id || member) !== (currentProject.admin._id || currentProject.admin) ? 
                            `<button class="btn btn-outline" style="margin-left: auto; padding: 0.25rem 0.75rem;" onclick="removeMember('${member._id || member}')">Remove</button>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="card" id="manageSection" style="display: none;">
            <h3 class="card-title">Join Requests</h3>
            <div id="requestsList">
                <div class="loading">Loading requests...</div>
            </div>
        </div>
    `;
}

// Load requests
async function loadRequests() {
    try {
        requests = await apiRequest('/requests/received');
        displayRequests();
    } catch (error) {
        console.error('Error loading requests:', error);
    }
}

// Display requests
function displayRequests() {
    const container = document.getElementById('requestsList');
    if (!container) return;

    // Filter requests for current project only
    const projectId = String(currentProject._id || currentProject.id || '');
    const pendingRequests = requests.filter(r => 
        r.status === 'Pending' && 
        (String(r.projectId?._id || r.projectId) === String(projectId))
    );
    
    if (pendingRequests.length === 0) {
        container.innerHTML = '<p style="color: #666;">No pending requests for this project</p>';
        return;
    }

    container.innerHTML = pendingRequests.map(request => `
        <div class="card" style="margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                ${getAvatarHTML(request.userId, 40)}
                <div style="flex: 1;">
                    <strong>${request.userId?.name || 'Unknown'}</strong>
                    <br>
                    <small style="color: #666;">${request.userId?.email || 'N/A'} • ${request.userId?.course || 'N/A'}</small>
                    ${request.userId?.rollNumber ? `<br><small style="color: #666;">Roll No: ${request.userId.rollNumber}</small>` : ''}
                </div>
            </div>
            <p style="margin: 0.5rem 0; padding: 0.5rem; background-color: var(--light-grey); border-radius: 5px;">
                <strong>Message:</strong> ${request.message || 'No message'}
            </p>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-primary" onclick="acceptRequest('${request._id}')">✓ Accept</button>
                <button class="btn btn-outline" onclick="rejectRequest('${request._id}')">✗ Reject</button>
            </div>
        </div>
    `).join('');
}

// Open request modal
function openRequestModal() {
    document.getElementById('requestModal').classList.add('show');
}

// Close request modal
function closeRequestModal() {
    document.getElementById('requestModal').classList.remove('show');
    document.getElementById('requestForm').reset();
}

// Setup request form
function setupRequestForm() {
    const form = document.getElementById('requestForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = document.getElementById('requestMessage').value;

            try {
                await apiRequest('/requests/send', {
                    method: 'POST',
                    body: JSON.stringify({
                        projectId: String(currentProject._id || currentProject.id || ''),
                        message
                    })
                });

                closeRequestModal();
                alert('Request sent successfully!');
                await loadProjectDetails(String(currentProject._id || currentProject.id || ''));
            } catch (error) {
                alert('Error: ' + error.message);
            }
        });
    }
}

// Accept request
async function acceptRequest(requestId) {
    if (!confirm('Accept this join request?')) return;
    
    try {
        await apiRequest(`/requests/accept/${requestId}`, { method: 'PUT' });
        const projectId = String(currentProject._id || currentProject.id || '');
        alert('Request accepted! Member added to project.');
        await loadProjectDetails(projectId);
        await loadRequests();
    } catch (error) {
        alert('Error accepting request: ' + error.message);
        console.error('Error:', error);
    }
}

// Reject request
async function rejectRequest(requestId) {
    if (!confirm('Reject this join request?')) return;
    
    try {
        await apiRequest(`/requests/reject/${requestId}`, { method: 'PUT' });
        alert('Request rejected.');
        await loadRequests();
    } catch (error) {
        alert('Error rejecting request: ' + error.message);
        console.error('Error:', error);
    }
}

// Remove member
async function removeMember(memberId) {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
        const projectId = String(currentProject._id || currentProject.id || '');
        await apiRequest(`/projects/${projectId}/members/${memberId}`, {
            method: 'DELETE'
        });
        await loadProjectDetails(projectId);
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Edit project
function editProject() {
    const title = prompt('Enter new title:', currentProject.title);
    if (!title) return;

    const description = prompt('Enter new description:', currentProject.description);
    if (!description) return;

    const techStack = prompt('Enter tech stack (comma separated):', currentProject.techStack.join(', '));
    if (!techStack) return;

    updateProject({
        title,
        description,
        techStack: techStack.split(',').map(t => t.trim())
    });
}

// Update project
async function updateProject(updates) {
    try {
        const projectId = String(currentProject._id || currentProject.id || '');
        await apiRequest(`/projects/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        await loadProjectDetails(projectId);
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Leave project
async function leaveProject() {
    if (!confirm('Are you sure you want to leave this project?')) return;

    try {
        // Note: This would require a new endpoint or using the remove member endpoint
        alert('Please contact the project admin to remove you from the project.');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Delete project (admin only)
async function deleteProject() {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone!')) {
        return;
    }

    if (!confirm('This will permanently delete the project and all its data. Continue?')) {
        return;
    }

    try {
        const projectId = currentProject._id || currentProject.id;
        await apiRequest(`/projects/${projectId}`, {
            method: 'DELETE'
        });
        
        alert('Project deleted successfully!');
        window.location.href = '/index.html';
    } catch (error) {
        alert('Error deleting project: ' + error.message);
        console.error('Error:', error);
    }
}

// Toggle user dropdown (make globally accessible)
window.toggleUserDropdown = function() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
};

// Logout (make globally accessible)
window.logout = function() {
    removeToken();
    removeCurrentUser();
    window.location.href = 'login.html';
};

