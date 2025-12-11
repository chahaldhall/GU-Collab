// Profile Search with Autocomplete

let searchTimeout = null;

// Initialize profile search on all pages
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('profileSearchInput');
    const searchResults = document.getElementById('profileSearchResults');
    
    if (!searchInput || !searchResults) {
        return; // Search not available on this page
    }
    
    // Handle input
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Hide results if query is too short
        if (query.length < 2) {
            searchResults.classList.remove('show');
            searchResults.innerHTML = '';
            return;
        }
        
        // Debounce search
        searchTimeout = setTimeout(() => {
            searchProfiles(query);
        }, 300);
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('show');
        }
    });
    
    // Handle keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchResults.classList.remove('show');
            searchInput.blur();
        }
    });
});

// Search profiles
async function searchProfiles(query) {
    const searchResults = document.getElementById('profileSearchResults');
    if (!searchResults) return;
    
    try {
        const users = await apiRequest(`/users/search?q=${encodeURIComponent(query)}`);
        
        if (users.length === 0) {
            searchResults.innerHTML = '<div class="profile-search-result-item" style="cursor: default; color: #666;">No users found</div>';
            searchResults.classList.add('show');
            return;
        }
        
        searchResults.innerHTML = users.map(user => {
            const avatarHTML = getAvatarHTML(user, 40);
            const roleLabel = user.role === 'teacher' ? 'Teacher' : 'Student';
            const roleInfo = user.role === 'student' 
                ? (user.course ? `${user.course}` : '')
                : (user.department ? `${user.department}` : '');
            
            const userId = String(user._id || user.id || '');
            return `
                <div class="profile-search-result-item" onclick="viewUserProfile('${userId}')">
                    ${avatarHTML}
                    <div class="result-info">
                        <div class="result-name">${escapeHtml(user.name)}</div>
                        <div class="result-email">${escapeHtml(user.email)}</div>
                        ${roleInfo ? `<div class="result-role">${roleLabel} • ${escapeHtml(roleInfo)}</div>` : `<div class="result-role">${roleLabel}</div>`}
                    </div>
                </div>
            `;
        }).join('');
        
        searchResults.classList.add('show');
    } catch (error) {
        console.error('Error searching profiles:', error);
        searchResults.innerHTML = '<div class="profile-search-result-item" style="cursor: default; color: red;">Error searching profiles</div>';
        searchResults.classList.add('show');
    }
}

// View user profile (make globally accessible)
window.viewUserProfile = function(userId) {
    if (!userId) {
        console.error('No userId provided');
        return;
    }
    
    // Close search results
    const searchResults = document.getElementById('profileSearchResults');
    const searchInput = document.getElementById('profileSearchInput');
    if (searchResults) {
        searchResults.classList.remove('show');
    }
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Check if viewing own profile
    const currentUser = getCurrentUser();
    const currentUserId = String(currentUser?.id || currentUser?._id || '');
    const targetUserId = String(userId);
    
    // If viewing own profile, redirect without userId parameter
    if (currentUserId && currentUserId === targetUserId) {
        window.location.href = 'profile.html';
    } else {
        // Redirect to profile page with userId parameter
        window.location.href = `profile.html?userId=${encodeURIComponent(userId)}`;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

