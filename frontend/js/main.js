/**
 * Hostel Room Allotment System - Main JavaScript
 * Common functions and utilities for the frontend
 */

// =====================================================
// API Configuration
// =====================================================
const API_BASE_URL = 'http://localhost:5000/api';

// =====================================================
// Authentication Utilities
// =====================================================

/**
 * Check if user is authenticated
 * @param {string} userType - 'student' or 'admin'
 * @returns {boolean}
 */
function isAuthenticated(userType = null) {
    const token = localStorage.getItem('accessToken');
    const storedUserType = localStorage.getItem('userType');
    
    if (!token) return false;
    if (userType && storedUserType !== userType) return false;
    
    return true;
}

/**
 * Get authentication headers for API requests
 * @returns {Object}
 */
function getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

/**
 * Logout user
 */
function logout() {
    localStorage.clear();
    window.location.href = '../index.html';
}

// =====================================================
// API Request Utilities
// =====================================================

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise}
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
        headers: getAuthHeaders()
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (response.status === 401) {
        // Token expired, redirect to login
        localStorage.clear();
        window.location.href = 'login.html';
        return;
    }
    
    return await response.json();
}

// =====================================================
// UI Utilities
// =====================================================

/**
 * Show alert message
 * @param {string} type - alert type (success, danger, warning, info)
 * @param {string} message - alert message
 * @param {string} containerId - container element ID
 */
function showAlert(type, message, containerId = 'alertContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    container.innerHTML = alertHtml;
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        const alert = container.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

/**
 * Format date string
 * @param {string} dateString 
 * @returns {string}
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format datetime string
 * @param {string} dateString 
 * @returns {string}
 */
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format currency
 * @param {number} amount 
 * @returns {string}
 */
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// =====================================================
// Status Helpers
// =====================================================

/**
 * Get badge color for status
 * @param {string} status 
 * @returns {string}
 */
function getStatusColor(status) {
    const colors = {
        'pending': 'warning',
        'approved': 'success',
        'rejected': 'danger',
        'waitlisted': 'info',
        'cancelled': 'secondary',
        'active': 'success',
        'inactive': 'secondary',
        'paid': 'success',
        'unpaid': 'danger',
        'partial': 'info',
        'available': 'success',
        'full': 'danger',
        'maintenance': 'warning',
        'reserved': 'info'
    };
    return colors[status?.toLowerCase()] || 'secondary';
}

/**
 * Get status badge HTML
 * @param {string} status 
 * @returns {string}
 */
function getStatusBadge(status) {
    const color = getStatusColor(status);
    return `<span class="badge bg-${color}">${status}</span>`;
}

// =====================================================
// Form Utilities
// =====================================================

/**
 * Serialize form data to JSON
 * @param {HTMLFormElement} form 
 * @returns {Object}
 */
function serializeForm(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        // Handle arrays
        if (key.endsWith('[]')) {
            const cleanKey = key.slice(0, -2);
            if (!data[cleanKey]) data[cleanKey] = [];
            data[cleanKey].push(value);
        } else {
            data[key] = value;
        }
    }
    
    return data;
}

/**
 * Validate email format
 * @param {string} email 
 * @returns {boolean}
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validate phone number
 * @param {string} phone 
 * @returns {boolean}
 */
function isValidPhone(phone) {
    const regex = /^[0-9]{10,15}$/;
    return regex.test(phone);
}

// =====================================================
// Loading Utilities
// =====================================================

/**
 * Show loading spinner on button
 * @param {HTMLElement} button 
 * @param {string} text 
 */
function showButtonLoading(button, text = 'Loading...') {
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${text}`;
}

/**
 * Hide loading spinner on button
 * @param {HTMLElement} button 
 */
function hideButtonLoading(button) {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || button.innerHTML;
}

// =====================================================
// Pagination Utilities
// =====================================================

/**
 * Create pagination HTML
 * @param {Object} pagination 
 * @param {Function} onPageChange 
 * @returns {string}
 */
function createPagination(pagination, onPageChange) {
    if (pagination.totalPages <= 1) return '';
    
    let html = '<nav aria-label="Page navigation"><ul class="pagination justify-content-center">';
    
    // Previous button
    html += `
        <li class="page-item ${!pagination.hasPrevPage ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${pagination.prevPage}" ${!pagination.hasPrevPage ? 'tabindex="-1"' : ''}>
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Page numbers
    for (let i = 1; i <= pagination.totalPages; i++) {
        if (i === 1 || i === pagination.totalPages || (i >= pagination.currentPage - 1 && i <= pagination.currentPage + 1)) {
            html += `
                <li class="page-item ${i === pagination.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        } else if (i === pagination.currentPage - 2 || i === pagination.currentPage + 2) {
            html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    
    // Next button
    html += `
        <li class="page-item ${!pagination.hasNextPage ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${pagination.nextPage}" ${!pagination.hasNextPage ? 'tabindex="-1"' : ''}>
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;
    
    html += '</ul></nav>';
    
    // Add click handlers
    setTimeout(() => {
        document.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.currentTarget.dataset.page);
                if (page && onPageChange) {
                    onPageChange(page);
                }
            });
        });
    }, 0);
    
    return html;
}

// =====================================================
// Counter Animation
// =====================================================

/**
 * Animate counter numbers
 */
function animateCounters() {
    const counters = document.querySelectorAll('.counter');
    
    counters.forEach(counter => {
        const target = parseInt(counter.dataset.target);
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const updateCounter = () => {
            current += step;
            if (current < target) {
                counter.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        };
        
        updateCounter();
    });
}

// Initialize counters when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.counter')) {
        animateCounters();
    }
});

// =====================================================
// Export for module usage
// =====================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isAuthenticated,
        getAuthHeaders,
        logout,
        apiRequest,
        showAlert,
        formatDate,
        formatDateTime,
        formatCurrency,
        getStatusColor,
        getStatusBadge,
        serializeForm,
        isValidEmail,
        isValidPhone,
        showButtonLoading,
        hideButtonLoading,
        createPagination
    };
}