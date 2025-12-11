// Authentication JavaScript

let resetEmail = '';

// Login form handler
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.error('Login form not found!');
        return;
    }
    
    // Initialize login role selector (student is default)
    if (typeof window.selectLoginRole === 'function') {
        window.selectLoginRole('student');
    }
    
    console.log('Login form found, attaching event listener...');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.style.display = 'none';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('loginRole') ? document.getElementById('loginRole').value : 'student';

        // Show loading state
        const submitButton = document.querySelector('#loginForm button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';

        try {
            console.log('Attempting login for:', email, 'as', role);
            
            const data = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password, role })
            });

            console.log('Login successful:', data);
            
            if (!data.token || !data.user) {
                throw new Error('Invalid response from server');
            }

            // Save token and user data
            setToken(data.token);
            setCurrentUser(data.user);
            
            // Ensure user has both id and _id
            if (data.user._id && !data.user.id) {
                data.user.id = data.user._id;
                setCurrentUser(data.user);
            }
            
            // Verify token was saved
            const savedToken = getToken();
            if (!savedToken) {
                throw new Error('Failed to save authentication token');
            }
            
            console.log('Token saved, redirecting to dashboard...');
            
            // Small delay to ensure localStorage is written
            setTimeout(() => {
                // Check user role and redirect accordingly
                if (data.user.role === 'teacher') {
                    window.location.href = 'teacher-index.html';
                } else {
                    window.location.href = 'index.html';
                }
            }, 100);
        } catch (error) {
            console.error('Login error:', error);
            
            // Show user-friendly error message
            let errorMessage = 'Login failed. ';
            
            if (error.message) {
                if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
                    errorMessage += 'Cannot connect to server. Please check if the server is running.';
                } else if (error.message.includes('Invalid') || error.message.includes('credentials')) {
                    errorMessage = 'Invalid email or password. Please check your credentials.';
                } else if (error.message.includes('provide email')) {
                    errorMessage = 'Please enter both email and password';
                } else if (error.message.includes('Server error')) {
                    errorMessage = 'Server error. Please check if MongoDB is running and try again.';
                } else {
                    errorMessage += error.message;
                }
            } else {
                errorMessage += 'Please try again or contact support.';
            }
            
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
            
            // Scroll to error
            errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
    
    console.log('✅ Login form handler attached successfully');
});

// Role selection function for signup (make globally accessible)
window.selectRole = function(role) {
    const studentTab = document.getElementById('studentTab');
    const teacherTab = document.getElementById('teacherTab');
    const studentFields = document.getElementById('studentFields');
    const teacherFields = document.getElementById('teacherFields');
    const roleInput = document.getElementById('role');
    const courseField = document.getElementById('course');
    const rollNumberField = document.getElementById('rollNumber');
    const departmentField = document.getElementById('department');
    
    if (!studentTab || !teacherTab || !studentFields || !teacherFields || !roleInput) {
        console.error('Role selector elements not found');
        return;
    }
    
    // Update hidden input
    roleInput.value = role;
    
    // Update tab styles
    if (role === 'student') {
        studentTab.classList.add('active');
        teacherTab.classList.remove('active');
        studentFields.style.display = 'block';
        teacherFields.style.display = 'none';
        
        // Clear and set required attributes for student fields
        if (courseField) {
            courseField.required = true;
        }
        if (rollNumberField) {
            rollNumberField.required = true;
        }
        if (departmentField) {
            departmentField.value = '';
            departmentField.required = false;
        }
    } else {
        studentTab.classList.remove('active');
        teacherTab.classList.add('active');
        studentFields.style.display = 'none';
        teacherFields.style.display = 'block';
        
        // Clear and set required attributes for teacher fields
        if (courseField) {
            courseField.value = '';
            courseField.required = false;
        }
        if (rollNumberField) {
            rollNumberField.value = '';
            rollNumberField.required = false;
        }
        if (departmentField) {
            departmentField.required = true;
        }
    }
}

// Role selection function for login (make globally accessible)
window.selectLoginRole = function(role) {
    const studentTab = document.getElementById('studentLoginTab');
    const teacherTab = document.getElementById('teacherLoginTab');
    const roleInput = document.getElementById('loginRole');
    const signupLinkContainer = document.getElementById('signupLinkContainer');
    
    if (!studentTab || !teacherTab || !roleInput) {
        console.error('Login role selector elements not found');
        return;
    }
    
    // Update hidden input
    roleInput.value = role;
    
    // Update tab styles
    if (role === 'student') {
        studentTab.classList.add('active');
        teacherTab.classList.remove('active');
        // Show signup link for students
        if (signupLinkContainer) {
            signupLinkContainer.style.display = 'block';
        }
    } else {
        studentTab.classList.remove('active');
        teacherTab.classList.add('active');
        // Hide signup link for teachers (they must be added by admin)
        if (signupLinkContainer) {
            signupLinkContainer.style.display = 'none';
        }
    }
}

// Initialize signup form on page load
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        // Signup form handler (only students can sign up)
        signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.style.display = 'none';

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const role = 'student'; // Only students can sign up
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Get student fields
        const course = document.getElementById('course').value;
        const rollNumber = document.getElementById('rollNumber').value;
        
        // Validate student fields
        if (!course || !rollNumber) {
            errorDiv.textContent = 'Please fill all required fields (Course and Roll Number)';
            errorDiv.style.display = 'block';
            return;
        }

        if (password !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const data = await apiRequest('/auth/signup', {
                method: 'POST',
                body: JSON.stringify({ 
                    name, 
                    email, 
                    role: 'student',
                    course, 
                    rollNumber, 
                    password, 
                    confirmPassword 
                })
            });

            setToken(data.token);
            setCurrentUser(data.user);
            
            // Ensure user has both id and _id
            if (data.user._id && !data.user.id) {
                data.user.id = data.user._id;
                setCurrentUser(data.user);
            }
            
            // Verify token was saved
            const savedToken = getToken();
            if (!savedToken) {
                throw new Error('Failed to save authentication token');
            }
            
            console.log('Signup successful, token saved, redirecting to dashboard...');
            
            // Small delay to ensure localStorage is written
            setTimeout(() => {
                // Check user role and redirect accordingly
                if (data.user.role === 'teacher') {
                    window.location.href = 'teacher-index.html';
                } else {
                    window.location.href = 'index.html';
                }
            }, 100);
        } catch (error) {
            console.error('Signup error:', error);
            // Show user-friendly error message
            let errorMessage = error.message || 'An error occurred during signup';
            
            // Handle specific error cases
            if (errorMessage.includes('Email must be from')) {
                errorMessage = 'Email must end with @geetauniversity.edu.in';
            } else if (errorMessage.includes('already exists') || errorMessage.includes('already registered')) {
                errorMessage = 'This email or roll number is already registered. Please use different credentials.';
            } else if (errorMessage.includes('fill all fields')) {
                errorMessage = 'Please fill all required fields';
            } else if (errorMessage.includes('Server error')) {
                errorMessage = 'Server error. Please check if MongoDB is running and try again.';
            }
            
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
            
            // Scroll to error
            errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        });
    }
});

// Forgot password handler
if (document.getElementById('forgotForm')) {
    document.getElementById('forgotForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';

        const email = document.getElementById('email').value;
        resetEmail = email;

        try {
            const data = await apiRequest('/auth/forgot', {
                method: 'POST',
                body: JSON.stringify({ email })
            });

            successDiv.textContent = 'OTP sent to your email' + (data.otp ? ` (OTP: ${data.otp})` : '');
            successDiv.style.display = 'block';
            document.getElementById('step1').style.display = 'none';
            document.getElementById('step2').style.display = 'block';

            // Focus first OTP input
            document.querySelector('.otp-input').focus();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    });
}

// OTP input handling
const otpInputs = document.querySelectorAll('.otp-input');
otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        if (e.target.value.length === 1 && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            otpInputs[index - 1].focus();
        }
    });
});

// Reset password handler
if (document.getElementById('resetPasswordBtn')) {
    document.getElementById('resetPasswordBtn').addEventListener('click', async () => {
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';

        const otp = Array.from(otpInputs).map(input => input.value).join('');
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        if (otp.length !== 6) {
            errorDiv.textContent = 'Please enter complete OTP';
            errorDiv.style.display = 'block';
            return;
        }

        if (newPassword !== confirmNewPassword) {
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            await apiRequest('/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ email: resetEmail, otp, newPassword })
            });

            successDiv.textContent = 'Password reset successfully! Redirecting to login...';
            successDiv.style.display = 'block';
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    });
}

