/**
 * Hostel Room Allotment System - Authentication JavaScript
 * Authentication-related functionality
 */

// =====================================================
// Check Authentication Status
// =====================================================

/**
 * Check if user is logged in
 * @param {string} requiredType - 'student' or 'admin'
 * @returns {boolean}
 */
function checkAuthStatus(requiredType = null) {
    const token = localStorage.getItem('accessToken');
    const userType = localStorage.getItem('userType');
    
    if (!token) {
        redirectToLogin(requiredType);
        return false;
    }
    
    if (requiredType && userType !== requiredType) {
        redirectToLogin(requiredType);
        return false;
    }
    
    return true;
}

/**
 * Redirect to appropriate login page
 * @param {string} userType 
 */
function redirectToLogin(userType) {
    const currentPath = window.location.pathname;
    
    if (userType === 'admin') {
        window.location.href = 'login.html';
    } else if (userType === 'student') {
        window.location.href = 'login.html';
    } else {
        // Default to student login
        window.location.href = 'login.html';
    }
}

// =====================================================
// Token Management
// =====================================================

/**
 * Store authentication tokens
 * @param {Object} tokens 
 */
function storeTokens(tokens) {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
}

/**
 * Get stored token
 * @param {string} type - 'access' or 'refresh'
 * @returns {string|null}
 */
function getToken(type = 'access') {
    return localStorage.getItem(type === 'access' ? 'accessToken' : 'refreshToken');
}

/**
 * Clear all stored tokens
 */
function clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userType');
    localStorage.removeItem('studentData');
    localStorage.removeItem('adminData');
}

/**
 * Refresh access token
 * @returns {Promise<boolean>}
 */
async function refreshAccessToken() {
    const refreshToken = getToken('refresh');
    
    if (!refreshToken) {
        clearTokens();
        redirectToLogin();
        return false;
    }
    
    try {
        const response = await fetch('http://localhost:5000/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('accessToken', data.data.accessToken);
            return true;
        } else {
            clearTokens();
            redirectToLogin();
            return false;
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        clearTokens();
        redirectToLogin();
        return false;
    }
}

// =====================================================
// User Data Management
// =====================================================

/**
 * Store user data
 * @param {Object} userData 
 * @param {string} type - 'student' or 'admin'
 */
function storeUserData(userData, type) {
    localStorage.setItem('userType', type);
    localStorage.setItem(type + 'Data', JSON.stringify(userData));
}

/**
 * Get stored user data
 * @param {string} type - 'student' or 'admin'
 * @returns {Object|null}
 */
function getUserData(type = null) {
    const userType = type || localStorage.getItem('userType');
    if (!userType) return null;
    
    const data = localStorage.getItem(userType + 'Data');
    return data ? JSON.parse(data) : null;
}

/**
 * Update stored user data
 * @param {Object} updates 
 * @param {string} type 
 */
function updateUserData(updates, type = null) {
    const userType = type || localStorage.getItem('userType');
    if (!userType) return;
    
    const currentData = getUserData(userType) || {};
    const newData = { ...currentData, ...updates };
    localStorage.setItem(userType + 'Data', JSON.stringify(newData));
}

// =====================================================
// Logout Functionality
// =====================================================

/**
 * Logout user
 * @param {string} redirectUrl 
 */
function logout(redirectUrl = null) {
    clearTokens();
    
    if (redirectUrl) {
        window.location.href = redirectUrl;
    } else {
        // Determine redirect based on current path
        const path = window.location.pathname;
        if (path.includes('/admin/')) {
            window.location.href = 'login.html';
        } else if (path.includes('/student/')) {
            window.location.href = 'login.html';
        } else {
            window.location.href = '../../index.html';
        }
    }
}

// =====================================================
// Password Validation
// =====================================================

/**
 * Validate password strength
 * @param {string} password 
 * @returns {Object}
 */
function validatePassword(password) {
    const result = {
        isValid: false,
        errors: []
    };
    
    if (password.length < 6) {
        result.errors.push('Password must be at least 6 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
        result.errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
        result.errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
        result.errors.push('Password must contain at least one number');
    }
    
    result.isValid = result.errors.length === 0;
    return result;
}

/**
 * Check if passwords match
 * @param {string} password 
 * @param {string} confirmPassword 
 * @returns {boolean}
 */
function passwordsMatch(password, confirmPassword) {
    return password === confirmPassword;
}

// =====================================================
// Form Helpers
// =====================================================

/**
 * Toggle password visibility
 * @param {string} inputId 
 * @param {HTMLElement} button 
 */
function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    }
}

/**
 * Setup password toggle buttons
 */
function setupPasswordToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach(button => {
        button.addEventListener('click', function() {
            const inputId = this.dataset.togglePassword;
            togglePasswordVisibility(inputId, this);
        });
    });
}

// =====================================================
// Remember Me Functionality
// =====================================================

/**
 * Save credentials (encrypted)
 * @param {string} username 
 * @param {string} password 
 */
function saveCredentials(username, password) {
    // Simple base64 encoding (not secure, use proper encryption in production)
    const encoded = btoa(JSON.stringify({ username, password }));
    localStorage.setItem('rememberedCredentials', encoded);
}

/**
 * Get saved credentials
 * @returns {Object|null}
 */
function getSavedCredentials() {
    const encoded = localStorage.getItem('rememberedCredentials');
    if (!encoded) return null;
    
    try {
        return JSON.parse(atob(encoded));
    } catch (e) {
        return null;
    }
}

/**
 * Clear saved credentials
 */
function clearSavedCredentials() {
    localStorage.removeItem('rememberedCredentials');
}

// =====================================================
// Session Management
// =====================================================

/**
 * Check session validity
 */
function checkSession() {
    const lastActivity = localStorage.getItem('lastActivity');
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes
    
    if (lastActivity) {
        const elapsed = Date.now() - parseInt(lastActivity);
        if (elapsed > sessionTimeout) {
            logout();
            return false;
        }
    }
    
    localStorage.setItem('lastActivity', Date.now().toString());
    return true;
}

/**
 * Update last activity timestamp
 */
function updateActivity() {
    localStorage.setItem('lastActivity', Date.now().toString());
}

// Update activity on user interaction
document.addEventListener('DOMContentLoaded', function() {
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
        document.addEventListener(event, updateActivity);
    });
    
    // Check session periodically
    setInterval(checkSession, 60000); // Check every minute
});

// =====================================================
// Auto-redirect if already logged in
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    
    // If on login page and already logged in, redirect to dashboard
    if (currentPath.includes('login.html')) {
        const token = localStorage.getItem('accessToken');
        const userType = localStorage.getItem('userType');
        
        if (token && userType) {
            if (currentPath.includes('/admin/') && userType === 'admin') {
                window.location.href = 'dashboard.html';
            } else if (currentPath.includes('/student/') && userType === 'student') {
                window.location.href = 'dashboard.html';
            }
        }
    }
});

// =====================================================
// Export functions
// =====================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkAuthStatus,
        redirectToLogin,
        storeTokens,
        getToken,
        clearTokens,
        refreshAccessToken,
        storeUserData,
        getUserData,
        updateUserData,
        logout,
        validatePassword,
        passwordsMatch,
        togglePasswordVisibility,
        setupPasswordToggles,
        saveCredentials,
        getSavedCredentials,
        clearSavedCredentials,
        checkSession,
        updateActivity
    };
}