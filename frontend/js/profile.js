// Profile JavaScript

let userProfile = null;

// Initialize profile page
document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;

    const profileLoaded = await loadProfile();
    
    // Check if viewing another user's profile
    const urlParams = new URLSearchParams(window.location.search);
    const viewingUserId = urlParams.get('userId');
    const isViewingOtherUser = !!viewingUserId;
    
    // Only setup functions if profile loaded successfully and it's own profile
    if (profileLoaded && !isViewingOtherUser) {
        setupEditForm();
        setupAddCompletedProjectForm();
        setupModalCloseHandlers();
    }
    setupDropdownCloseHandler();
});

// Load profile
async function loadProfile() {
    try {
        // Check if viewing another user's profile
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        
        if (userId) {
            // Check if viewing own profile
            const currentUser = getCurrentUser();
            const currentUserId = String(currentUser?.id || currentUser?._id || '');
            const targetUserId = String(userId);
            
            // If viewing own profile, use /users/me endpoint
            if (currentUserId && currentUserId === targetUserId) {
                userProfile = await apiRequest('/users/me');
                console.log('Loaded own profile:', userProfile);
                console.log('Profile image path:', userProfile.profileImage);
                displayProfile(userProfile, false); // false = own profile (can edit)
            } else {
                // Load another user's profile
                userProfile = await apiRequest(`/users/${userId}`);
                console.log('Loaded other user profile:', userProfile);
                displayProfile(userProfile, true); // true = viewing other user's profile (read-only)
            }
        } else {
            // Load current user's profile
            userProfile = await apiRequest('/users/me');
            console.log('Loaded current user profile:', userProfile);
            console.log('Profile image path:', userProfile.profileImage);
            displayProfile(userProfile, false); // false = own profile (can edit)
        }
        
        // Hide sections for teachers
        const isTeacher = userProfile.role === 'teacher';
        if (isTeacher) {
            // Hide calendar, projects, and completed projects for teachers
            const calendarSection = document.getElementById('calendarSection');
            const projectsCreatedSection = document.getElementById('projectsCreatedSection');
            const projectsJoinedSection = document.getElementById('projectsJoinedSection');
            const completedProjectsSection = document.getElementById('completedProjectsSection');
            
            if (calendarSection) calendarSection.style.display = 'none';
            if (projectsCreatedSection) projectsCreatedSection.style.display = 'none';
            if (projectsJoinedSection) projectsJoinedSection.style.display = 'none';
            if (completedProjectsSection) completedProjectsSection.style.display = 'none';
        } else {
            // Students: show all sections (for both own profile and viewing other students)
                const calendarSection = document.getElementById('calendarSection');
            const completedProjectsSection = document.getElementById('completedProjectsSection');
                const projectsCreatedSection = document.getElementById('projectsCreatedSection');
                const projectsJoinedSection = document.getElementById('projectsJoinedSection');
            
            if (calendarSection) calendarSection.style.display = 'block';
            if (completedProjectsSection) completedProjectsSection.style.display = 'block';
            if (projectsCreatedSection) projectsCreatedSection.style.display = 'block';
            if (projectsJoinedSection) projectsJoinedSection.style.display = 'block';
            
            // Load and render data (works for both own profile and viewing other students)
            await loadUserProjects(userProfile);
            renderCalendar(userProfile.visits || []);
        }
        return true; // Return true on success
    } catch (error) {
        console.error('Error loading profile:', error);
        
        // Only redirect to login if it's an authentication error
        const errorMessage = (error.message || '').toLowerCase();
        const isAuthError = errorMessage.includes('no token') || 
                          errorMessage.includes('authorization denied') || 
                          errorMessage.includes('token is not valid') ||
                          errorMessage.includes('token') && (errorMessage.includes('invalid') || errorMessage.includes('expired')) ||
                          errorMessage.includes('401') ||
                          errorMessage.includes('unauthorized') ||
                          errorMessage.includes('not authenticated');
        
        if (isAuthError) {
            // Clear invalid token and user data
            removeToken();
            removeCurrentUser();
            window.location.href = 'login.html';
            return false;
        } else {
            // For other errors (network, server errors), show error but stay on page
            const container = document.querySelector('.profile-container');
            if (container) {
                container.innerHTML = `
                    <div class="card" style="text-align: center; padding: 2rem;">
                        <h3 style="color: var(--navy-blue); margin-bottom: 1rem;">Error Loading Profile</h3>
                        <p style="color: #666; margin-bottom: 1rem;">${error.message || 'Unknown error'}</p>
                        <button class="btn btn-primary" onclick="location.reload()">Retry</button>
                    </div>
                `;
            } else {
                alert('Error loading profile: ' + (error.message || 'Unknown error'));
            }
            return false; // Return false on error
        }
    }
}

// Display profile
function displayProfile(user, isViewingOtherUser = false) {
    const isTeacher = user.role === 'teacher';
    
    // Always update navbar with current user's info (not the viewed user's)
    const currentUser = getCurrentUser();
    if (currentUser) {
        if (!isViewingOtherUser) {
            // If viewing own profile, update current user data with latest profile data
            currentUser.name = user.name;
            currentUser.profileImage = user.profileImage;
            setCurrentUser(currentUser);
        }
        // Always show current user's info in navbar (never the viewed user's)
        const userNameEl = document.getElementById('userName');
        const userAvatarEl = document.getElementById('userAvatar');
        if (userNameEl) {
            userNameEl.textContent = currentUser.name;
        }
        if (userAvatarEl) {
            userAvatarEl.innerHTML = getAvatarHTML(currentUser);
        }
    }
    
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = user.email;
    
    // Show/hide fields based on role
    if (isTeacher) {
        // Hide student fields
        document.getElementById('profileRollNo').style.display = 'none';
        document.getElementById('profileCourse').style.display = 'none';
        // Show teacher fields
        const deptElement = document.getElementById('profileDepartment');
        const deptValueElement = document.getElementById('profileDepartmentValue');
        if (deptElement && deptValueElement) {
            deptElement.style.display = 'block';
            deptValueElement.textContent = user.department || 'Not specified';
        }
    } else {
        // Show student fields
        const rollNoElement = document.getElementById('profileRollNo');
        const rollNoValueElement = document.getElementById('profileRollNoValue');
        if (rollNoElement && rollNoValueElement) {
            rollNoElement.style.display = 'block';
            rollNoValueElement.textContent = user.rollNumber || 'Not specified';
        }
        const courseElement = document.getElementById('profileCourse');
        const courseValueElement = document.getElementById('profileCourseValue');
        if (courseElement && courseValueElement) {
            courseElement.style.display = 'block';
            courseValueElement.textContent = user.course || 'Not specified';
        }
        // Hide teacher fields
        document.getElementById('profileDepartment').style.display = 'none';
    }
    
    const githubLink = document.getElementById('githubLink');
    if (user.githubId) {
        githubLink.href = `https://github.com/${user.githubId}`;
        githubLink.textContent = `GitHub: ${user.githubId}`;
    } else {
        githubLink.style.display = 'none';
    }
    
    const linkedinLink = document.getElementById('linkedinLink');
    if (user.linkedinId) {
        linkedinLink.href = `https://linkedin.com/in/${user.linkedinId}`;
        linkedinLink.textContent = `LinkedIn: ${user.linkedinId}`;
    } else {
        linkedinLink.style.display = 'none';
    }
    
    document.getElementById('profileBio').textContent = user.bio || 'No bio yet';
    
    const skillsDiv = document.getElementById('profileSkills');
    if (user.skills && user.skills.length > 0) {
        skillsDiv.innerHTML = user.skills.map(skill => `<span class="tag">${skill}</span>`).join('');
    } else {
        skillsDiv.innerHTML = '<span style="color: #666;">No skills added yet</span>';
    }
    
    // Hide edit button if viewing another user's profile
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        if (isViewingOtherUser) {
            editProfileBtn.style.display = 'none';
        } else {
            editProfileBtn.style.display = 'block';
        }
    }
    
    // Display avatar - always use first letter (image upload feature removed)
    const profileAvatar = document.getElementById('profileAvatar');
    const letter = user.name ? user.name.charAt(0).toUpperCase() : '?';
    profileAvatar.innerHTML = `<div class="profile-avatar-letter">${letter}</div>`;
    
    // Show completed projects section for students (both own profile and viewing other students)
    if (!isTeacher) {
        const completedProjectsSection = document.getElementById('completedProjectsSection');
        if (completedProjectsSection) {
            completedProjectsSection.style.display = 'block';
            
            // Hide "Add Completed Project" button when viewing other students
            const addProjectBtn = completedProjectsSection.querySelector('button');
            if (addProjectBtn) {
                if (isViewingOtherUser) {
                    addProjectBtn.style.display = 'none';
                } else {
                    addProjectBtn.style.display = 'block';
                }
            }
        }
    }
    
    // Display completed projects (for both own profile and viewing other students)
    displayCompletedProjects(user.completedProjects || []);
}

// Display completed projects
function displayCompletedProjects(projects) {
    const container = document.getElementById('completedProjects');
    if (projects.length === 0) {
        container.innerHTML = '<p style="color: #666;">No completed projects yet</p>';
        return;
    }
    
    container.innerHTML = projects.map(project => `
        <div class="card" style="margin-bottom: 1rem;">
            <h4 style="color: var(--navy-blue); margin-bottom: 0.5rem;">${project.title}</h4>
            <p style="margin-bottom: 0.5rem;">${project.description}</p>
            <p><strong>Learnings:</strong> ${project.learnings}</p>
            ${project.githubLink ? `<p><a href="${project.githubLink}" target="_blank" class="profile-link">GitHub Link</a></p>` : ''}
            ${project.hackathons && project.hackathons.length > 0 ? 
                `<p><strong>Hackathons:</strong> ${project.hackathons.join(', ')}</p>` : ''}
            <small style="color: #666;">${formatDate(project.createdAt)}</small>
        </div>
    `).join('');
}

// Load user projects (works for both own profile and viewing other students)
async function loadUserProjects(profileUser = null) {
    try {
        const allProjects = await apiRequest('/projects');
        // Use provided profile user or default to userProfile
        const targetUser = profileUser || userProfile;
        const userId = String(targetUser._id || targetUser.id);
        
        const userProjects = allProjects.filter(p => {
            const adminId = String(p.admin?._id || p.admin || '');
            const isAdmin = adminId === userId;
            const isMember = p.members && p.members.some(m => {
                const memberId = String(m?._id || m || '');
                return memberId === userId;
            });
            return isAdmin || isMember;
        });
        
        const created = userProjects.filter(p => {
            const adminId = String(p.admin?._id || p.admin || '');
            return adminId === userId;
        });
        
        const joined = userProjects.filter(p => {
            const adminId = String(p.admin?._id || p.admin || '');
            return adminId !== userId;
        });
        
        displayProjectsCreated(created);
        displayProjectsJoined(joined);
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Display projects created
function displayProjectsCreated(projects) {
    const container = document.getElementById('projectsCreated');
    if (projects.length === 0) {
        container.innerHTML = '<p style="color: #666;">No projects created yet</p>';
        return;
    }
    
    const currentUser = getCurrentUser();
    const currentUserId = String(currentUser?.id || currentUser?._id || '');
    
    container.innerHTML = projects.map(project => {
        // Check if current user is a team member of this project
        const adminId = String(project.admin?._id || project.admin || '');
        const isAdmin = adminId === currentUserId;
        const isMember = project.members?.some(m => {
            const memberId = String(m?._id || m || '');
            return memberId === currentUserId;
        }) || false;
        const canChat = isAdmin || isMember;
        
        return `
        <div class="card" style="margin-bottom: 1rem;">
            <h4 style="color: var(--navy-blue); margin-bottom: 0.5rem;">${project.title}</h4>
            <p style="margin-bottom: 0.5rem;">${project.description}</p>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-outline" onclick="window.location.href='project-details.html?id=${project._id}'">View</button>
                ${canChat ? `<button class="btn btn-secondary" onclick="window.location.href='chat.html?projectId=${project._id}'">Chat</button>` : ''}
            </div>
        </div>
        `;
    }).join('');
}

// Display projects joined
function displayProjectsJoined(projects) {
    const container = document.getElementById('projectsJoined');
    if (projects.length === 0) {
        container.innerHTML = '<p style="color: #666;">No projects joined yet</p>';
        return;
    }
    
    const currentUser = getCurrentUser();
    const currentUserId = String(currentUser?.id || currentUser?._id || '');
    
    container.innerHTML = projects.map(project => {
        // Check if current user is a team member of this project
        const adminId = String(project.admin?._id || project.admin || '');
        const isAdmin = adminId === currentUserId;
        const isMember = project.members?.some(m => {
            const memberId = String(m?._id || m || '');
            return memberId === currentUserId;
        }) || false;
        const canChat = isAdmin || isMember;
        
        return `
        <div class="card" style="margin-bottom: 1rem;">
            <h4 style="color: var(--navy-blue); margin-bottom: 0.5rem;">${project.title}</h4>
            <p style="margin-bottom: 0.5rem;">${project.description}</p>
            <p><small style="color: #666;">Admin: ${project.admin?.name || 'Unknown'}</small></p>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-outline" onclick="window.location.href='project-details.html?id=${project._id}'">View</button>
                ${canChat ? `<button class="btn btn-secondary" onclick="window.location.href='chat.html?projectId=${project._id}'">Chat</button>` : ''}
            </div>
        </div>
        `;
    }).join('');
}

// Render calendar with month labels
function renderCalendar(visits) {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364); // 52 weeks ago (1 year)
    
    // Create visit map
    const visitMap = {};
    visits.forEach(visit => {
        visitMap[visit.date] = visit.count || 1;
    });
    
    // Get month names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Calculate which day of the week the start date is (0 = Sunday, 1 = Monday, etc.)
    let startDayOfWeek = startDate.getDay();
    // Adjust to start from Monday (0 = Monday, 6 = Sunday)
    startDayOfWeek = (startDayOfWeek + 6) % 7;
    
    // Track months and their positions (in terms of week index)
    const monthPositions = [];
    const weekToMonthMap = {}; // Map week index to month index
    let currentMonth = startDate.getMonth();
    let monthStartWeek = 0;
    const totalDays = 365; // 365 days in a year
    const cellsPerWeek = 7;
    const totalCells = startDayOfWeek + totalDays;
    const totalWeeks = Math.ceil(totalCells / cellsPerWeek);
    
    // First pass: determine which month each week belongs to
    // A week belongs to the month that has the 1st of the month, or the month with most days
    const weekMonthCount = {}; // Track day count per month per week
    const weekHasFirstOfMonth = {}; // Track if week contains 1st of any month
    for (let week = 0; week < totalWeeks; week++) {
        weekMonthCount[week] = {};
        weekHasFirstOfMonth[week] = null;
    }
    
    // Fill in the days and track month distribution per week
    for (let day = 0; day < totalDays; day++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + day);
        date.setHours(0, 0, 0, 0);
        
        const dateMonth = date.getMonth();
        const dayOfMonth = date.getDate();
        const cellIndex = startDayOfWeek + day;
        const weekIndex = Math.floor(cellIndex / cellsPerWeek);
        
        if (weekIndex < totalWeeks) {
            if (!weekMonthCount[weekIndex][dateMonth]) {
                weekMonthCount[weekIndex][dateMonth] = 0;
            }
            weekMonthCount[weekIndex][dateMonth]++;
            
            // Check if this is the 1st of a month (takes priority)
            if (dayOfMonth === 1) {
                weekHasFirstOfMonth[weekIndex] = dateMonth;
            }
        }
    }
    
    // Assign each week to the month
    // Priority: 1) week has 1st of month, 2) month with most days
    for (let week = 0; week < totalWeeks; week++) {
        let assignedMonth = currentMonth;
        
        // Check if week contains 1st of a month (highest priority)
        if (weekHasFirstOfMonth[week] !== null) {
            assignedMonth = weekHasFirstOfMonth[week];
        } else {
            // Otherwise, assign to month with most days
            const counts = weekMonthCount[week];
            let maxCount = 0;
            for (const month in counts) {
                if (counts[month] > maxCount) {
                    maxCount = counts[month];
                    assignedMonth = parseInt(month);
                }
            }
        }
        weekToMonthMap[week] = assignedMonth;
    }
    
    // Track month positions based on week assignments
    let monthStartWeekForTracking = 0;
    let previousMonth = weekToMonthMap[0];
    for (let week = 0; week < totalWeeks; week++) {
        const weekMonth = weekToMonthMap[week];
        if (weekMonth !== previousMonth && week > 0) {
            // New month starts
            monthPositions.push({
                month: previousMonth,
                startWeek: monthStartWeekForTracking,
                endWeek: week - 1
            });
            monthStartWeekForTracking = week;
            previousMonth = weekMonth;
        }
    }
    // Add last month
    if (monthStartWeekForTracking < totalWeeks) {
        monthPositions.push({
            month: previousMonth,
            startWeek: monthStartWeekForTracking,
            endWeek: totalWeeks - 1
        });
    }
    
    // Organize days by weeks (7 rows × 53 columns)
    // Each column is a week, each row is a day of week (Mon=0, Sun=6)
    // Structure: weeksData[weekIndex][dayOfWeekIndex]
    const weeksData = [];
    
    // Initialize weeks array
    for (let week = 0; week < totalWeeks; week++) {
        weeksData.push(new Array(7).fill(null));
    }
    
    // Fill in the days - only place days in weeks that belong to their month
    for (let day = 0; day < totalDays; day++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + day);
        date.setHours(0, 0, 0, 0);
        
        const dateMonth = date.getMonth();
        const dateStr = date.toISOString().split('T')[0];
        const monthName = monthNames[dateMonth];
        const dayOfMonth = date.getDate();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[date.getDay()];
        
        // Calculate which week and which day of week (0=Mon, 6=Sun)
        const cellIndex = startDayOfWeek + day;
        const weekIndex = Math.floor(cellIndex / cellsPerWeek);
        const dayOfWeekIndex = cellIndex % cellsPerWeek;
        
        // Only place day if the week belongs to this day's month
        const weekMonth = weekToMonthMap[weekIndex];
        if (weekMonth === dateMonth && weekIndex < weeksData.length && dayOfWeekIndex < 7) {
            const count = visitMap[dateStr] || 0;
            let level = 0;
            if (count >= 7) level = 4;
            else if (count >= 4) level = 3;
            else if (count >= 2) level = 2;
            else if (count >= 1) level = 1;
            
            const levelClass = level > 0 ? `level-${level}` : '';
            let tooltipText = `${dayName}, ${monthName} ${dayOfMonth}, ${date.getFullYear()}`;
            if (count > 0) {
                tooltipText += ` - ${count} ${count === 1 ? 'activity' : 'activities'}`;
            } else {
                tooltipText += ' - No activity';
            }
            
            const dayClass = date > today ? ' future' : '';
            const dayHtml = `<div class="calendar-day ${levelClass}${dayClass}" title="${tooltipText}"></div>`;
            weeksData[weekIndex][dayOfWeekIndex] = dayHtml;
        }
    }
    
    // Track month boundaries for spacing
    const monthBoundaries = new Set(); // Weeks that start a new month (for extra spacing)
    
    monthPositions.forEach((monthInfo, monthIndex) => {
        // Mark the start of each month (except first) as a boundary for extra spacing
        if (monthIndex > 0 && monthInfo.startWeek > 0) {
            monthBoundaries.add(monthInfo.startWeek);
        }
    });
    
    // Build HTML: 7 rows (days) × (totalWeeks + spacers) columns
    // Each row represents a day of week, each column represents a week or spacer
    // Add spacer columns before month boundaries to create visual gaps
    let html = '';
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        for (let week = 0; week < totalWeeks; week++) {
            const isMonthBoundary = monthBoundaries.has(week);
            
            // Add spacer column before month boundary (creates gap between months)
            // This spacer spans all 7 rows, creating a full vertical gap
            if (isMonthBoundary) {
                html += '<div class="calendar-day month-spacer"></div>';
            }
            
            if (week === 0 && dayOfWeek < startDayOfWeek) {
                // Empty cells at the start of first week
                html += '<div class="calendar-day empty"></div>';
            } else if (weeksData[week] && weeksData[week][dayOfWeek]) {
                html += weeksData[week][dayOfWeek];
            } else {
                // Empty cell or future week
                html += '<div class="calendar-day empty"></div>';
            }
        }
    }
    
    // Calculate total columns including spacers
    const totalColumns = totalWeeks + monthBoundaries.size;
    
    // Create month labels row (BELOW the grid, like GitHub)
    let monthLabelsHtml = '<div class="calendar-month-labels">';
    
    // Track which months we've already shown to avoid duplicates
    const shownMonths = new Set();
    
    // Track how many spacers have been added before each week to adjust label positions
    let spacerOffset = 0;
    
    monthPositions.forEach((monthInfo, index) => {
        const monthName = monthNames[monthInfo.month];
        const startWeek = monthInfo.startWeek;
        const endWeek = monthInfo.endWeek;
        const isMonthStart = index > 0 && monthBoundaries.has(startWeek);
        
        // Adjust for spacers added before this month
        if (isMonthStart) {
            spacerOffset++;
        }
        
        // Show label for first occurrence of each month, or if there's significant gap
        const monthKey = `${monthInfo.month}-${startWeek}`;
        const prevEndWeek = index > 0 ? monthPositions[index - 1].endWeek : -1;
        const gapWeeks = startWeek - prevEndWeek;
        
        const shouldShow = !shownMonths.has(monthInfo.month) || gapWeeks > 2;
        
        if (shouldShow && !shownMonths.has(monthKey)) {
            shownMonths.add(monthInfo.month);
            shownMonths.add(monthKey);
            
            // Calculate position accounting for spacer columns
            const adjustedStartWeek = startWeek + (isMonthStart ? spacerOffset - 1 : spacerOffset);
            const leftPosition = (adjustedStartWeek / totalColumns) * 100;
            const weekSpan = Math.max(endWeek - startWeek + 1, 1);
            const width = (weekSpan / totalColumns) * 100;
            
            monthLabelsHtml += `<span class="calendar-month-label${isMonthStart ? ' month-label-start' : ''}" style="left: ${leftPosition}%; min-width: ${Math.max(width, 2.5)}%;">${monthName}</span>`;
        }
    });
    
    monthLabelsHtml += '</div>';
    
    // Wrap the calendar in a scrollable container
    // Grid structure: 7 rows (days) × totalColumns columns (weeks + spacers)
    grid.innerHTML = `
        <div class="calendar-scroll-container" style="scroll-behavior: smooth;">
            <div class="calendar-content-wrapper">
                <div class="calendar-days-container" style="grid-template-columns: repeat(${totalColumns}, 1fr); grid-template-rows: repeat(7, 1fr);">${html}</div>
                ${monthLabelsHtml}
            </div>
        </div>
    `;
    
    // Scroll to show current date on the right after a short delay
    setTimeout(() => {
        const scrollContainer = grid.querySelector('.calendar-scroll-container');
        if (scrollContainer) {
            scrollContainer.scrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
        }
    }, 100);
}

// Open edit modal (make globally accessible)
window.openEditModal = function() {
    if (!userProfile) {
        alert('Profile not loaded yet. Please wait...');
        return;
    }
    const isTeacher = userProfile.role === 'teacher';
    
    document.getElementById('editName').value = userProfile.name;
    
    // Show/hide department field for teachers
    const deptGroup = document.getElementById('editDepartmentGroup');
    const deptInput = document.getElementById('editDepartment');
    if (isTeacher && deptGroup && deptInput) {
        deptGroup.style.display = 'block';
        deptInput.value = userProfile.department || '';
    } else if (deptGroup) {
        deptGroup.style.display = 'none';
    }
    
    document.getElementById('editGithub').value = userProfile.githubId || '';
    document.getElementById('editLinkedin').value = userProfile.linkedinId || '';
    document.getElementById('editBio').value = userProfile.bio || '';
    document.getElementById('editSkills').value = userProfile.skills ? userProfile.skills.join(', ') : '';
    document.getElementById('editModal').classList.add('show');
};

// Close edit modal (make globally accessible)
window.closeEditModal = function() {
    document.getElementById('editModal').classList.remove('show');
};

// Setup edit form
function setupEditForm() {
    const editForm = document.getElementById('editForm');
    if (!editForm) {
        console.warn('Edit form element not found');
        return;
    }
    
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('editName').value;
        const githubId = document.getElementById('editGithub').value;
        const linkedinId = document.getElementById('editLinkedin').value;
        const bio = document.getElementById('editBio').value;
        const skills = document.getElementById('editSkills').value.split(',').map(s => s.trim()).filter(s => s);
        
        // Get department if teacher
        const isTeacher = userProfile.role === 'teacher';
        const updateData = {
            name,
            githubId,
            linkedinId,
            bio,
            skills
        };
        
        if (isTeacher) {
            const department = document.getElementById('editDepartment').value;
            if (department) {
                updateData.department = department;
            }
        }
        
        try {
            await apiRequest('/users/me', {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });
            
            closeEditModal();
            await loadProfile();
        } catch (error) {
            alert('Error updating profile: ' + error.message);
        }
    });
}

// Open add completed project modal (make globally accessible)
window.openAddCompletedProjectModal = function() {
    document.getElementById('addCompletedProjectModal').classList.add('show');
};

// Close add completed project modal (make globally accessible)
window.closeAddCompletedProjectModal = function() {
    document.getElementById('addCompletedProjectModal').classList.remove('show');
};

// Setup add completed project form
function setupAddCompletedProjectForm() {
    const addForm = document.getElementById('addCompletedProjectForm');
    if (!addForm) {
        console.warn('Add completed project form element not found');
        return;
    }
    
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('projectTitle').value;
        const description = document.getElementById('projectDescription').value;
        const learnings = document.getElementById('projectLearnings').value;
        const githubLink = document.getElementById('projectGithub').value;
        const hackathons = document.getElementById('projectHackathons').value.split(',').map(h => h.trim()).filter(h => h);
        
        try {
            await apiRequest('/users/completed-projects', {
                method: 'POST',
                body: JSON.stringify({ title, description, learnings, githubLink, hackathons })
            });
            
            closeAddCompletedProjectModal();
            document.getElementById('addCompletedProjectForm').reset();
            await loadProfile();
        } catch (error) {
            alert('Error adding project: ' + error.message);
        }
    });
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

// Setup modal close handlers (click outside to close)
function setupModalCloseHandlers() {
    const editModal = document.getElementById('editModal');
    const addProjectModal = document.getElementById('addCompletedProjectModal');
    
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                closeEditModal();
            }
        });
    }
    
    if (addProjectModal) {
        addProjectModal.addEventListener('click', (e) => {
            if (e.target === addProjectModal) {
                closeAddCompletedProjectModal();
            }
        });
    }
}

// Setup dropdown close handler (click outside to close)
function setupDropdownCloseHandler() {
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('userDropdown');
        const userAvatar = document.getElementById('userAvatar');
        
        if (dropdown && !dropdown.contains(e.target) && userAvatar && !userAvatar.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
}

// Handle image load errors and attempt to repair
async function handleImageLoadError(imagePath, userId, letter) {
    console.error('Image failed to load:', imagePath);
    
    // Try to repair the avatar path
    try {
        const response = await apiRequest('/users/repair-avatar', {
            method: 'POST'
        });
        
        if (response.message && response.newPath) {
            console.log('Avatar path repaired:', response.newPath);
            // Reload the profile to show the repaired image
            await loadProfile();
        } else {
            // Repair didn't work, show fallback
            const profileAvatar = document.getElementById('profileAvatar');
            if (profileAvatar) {
                profileAvatar.innerHTML = `<div class="profile-avatar-letter">${letter}</div>`;
            }
        }
    } catch (error) {
        console.error('Failed to repair avatar:', error);
        // Show fallback
        const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar) {
            profileAvatar.innerHTML = `<div class="profile-avatar-letter">${letter}</div>`;
        }
    }
}

// Make it globally accessible
window.handleImageLoadError = handleImageLoadError;


