/**
 * Utility Helper Functions Module
 * Contains common utility functions used across the application
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// =====================================================
// Password Hashing Utilities
// =====================================================

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} - True if passwords match
 */
const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// =====================================================
// JWT Token Utilities
// =====================================================

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload
 * @returns {string} - JWT token
 */
const generateAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '24h'
    });
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload
 * @returns {string} - JWT refresh token
 */
const generateRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
    });
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} - Object containing both tokens
 */
const generateTokens = (user) => {
    const payload = {
        id: user.id,
        userType: user.userType,
        email: user.email,
        role: user.role || null
    };

    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload)
    };
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

// =====================================================
// Response Utilities
// =====================================================

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code
 */
const sendSuccess = (res, message = 'Success', data = null, statusCode = 200) => {
    const response = {
        success: true,
        message
    };

    if (data !== null) {
        response.data = data;
    }

    return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {*} errors - Additional error details
 */
const sendError = (res, message = 'Error occurred', statusCode = 500, errors = null) => {
    const response = {
        success: false,
        message
    };

    if (errors !== null) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};

// =====================================================
// Pagination Utilities
// =====================================================

/**
 * Create pagination metadata
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} - Pagination metadata
 */
const createPagination = (page, limit, total) => {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
    };
};

/**
 * Get pagination parameters from request
 * @param {Object} req - Express request object
 * @returns {Object} - Pagination parameters
 */
const getPaginationParams = (req) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    return { page, limit, offset };
};

// =====================================================
// Date Utilities
// =====================================================

/**
 * Format date to ISO string (YYYY-MM-DD)
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0];
};

/**
 * Format datetime to ISO string
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted datetime string
 */
const formatDateTime = (date) => {
    if (!date) return null;
    return new Date(date).toISOString();
};

/**
 * Add days to a date
 * @param {Date|string} date - Starting date
 * @param {number} days - Number of days to add
 * @returns {Date} - New date
 */
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

/**
 * Add months to a date
 * @param {Date|string} date - Starting date
 * @param {number} months - Number of months to add
 * @returns {Date} - New date
 */
const addMonths = (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
};

/**
 * Calculate difference in days between two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} - Difference in days
 */
const daysDifference = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// =====================================================
// String Utilities
// =====================================================

/**
 * Generate a random string
 * @param {number} length - Length of the string
 * @returns {string} - Random string
 */
const generateRandomString = (length = 10) => {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
};

/**
 * Generate a unique ID
 * @returns {string} - Unique ID
 */
const generateUniqueId = () => {
    return crypto.randomUUID();
};

/**
 * Slugify a string
 * @param {string} text - Text to slugify
 * @returns {string} - Slugified text
 */
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

/**
 * Capitalize first letter of each word
 * @param {string} text - Text to capitalize
 * @returns {string} - Capitalized text
 */
const capitalizeWords = (text) => {
    return text
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

// =====================================================
// Validation Utilities
// =====================================================

/**
 * Check if string is valid email
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Check if string is valid phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
const isValidPhone = (phone) => {
    const phoneRegex = /^[0-9]{10,15}$/;
    return phoneRegex.test(phone);
};

/**
 * Sanitize string input
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeString = (str) => {
    if (!str) return '';
    return str
        .trim()
        .replace(/[<>]/g, '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

// =====================================================
// Array/Object Utilities
// =====================================================

/**
 * Remove null/undefined values from object
 * @param {Object} obj - Object to clean
 * @returns {Object} - Cleaned object
 */
const removeNullValues = (obj) => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v != null)
    );
};

/**
 * Pick specific keys from object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to pick
 * @returns {Object} - New object with picked keys
 */
const pick = (obj, keys) => {
    return Object.fromEntries(
        Object.entries(obj).filter(([key]) => keys.includes(key))
    );
};

/**
 * Omit specific keys from object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to omit
 * @returns {Object} - New object without omitted keys
 */
const omit = (obj, keys) => {
    return Object.fromEntries(
        Object.entries(obj).filter(([key]) => !keys.includes(key))
    );
};

// =====================================================
// File Utilities
// =====================================================

/**
 * Get file extension
 * @param {string} filename - Filename
 * @returns {string} - File extension
 */
const getFileExtension = (filename) => {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

/**
 * Generate unique filename
 * @param {string} originalName - Original filename
 * @returns {string} - Unique filename
 */
const generateUniqueFilename = (originalName) => {
    const ext = getFileExtension(originalName);
    const timestamp = Date.now();
    const random = generateRandomString(8);
    return `${timestamp}_${random}.${ext}`;
};

// =====================================================
// Export all utilities
// =====================================================

module.exports = {
    // Password
    hashPassword,
    comparePassword,
    
    // JWT
    generateAccessToken,
    generateRefreshToken,
    generateTokens,
    verifyToken,
    
    // Response
    sendSuccess,
    sendError,
    
    // Pagination
    createPagination,
    getPaginationParams,
    
    // Date
    formatDate,
    formatDateTime,
    addDays,
    addMonths,
    daysDifference,
    
    // String
    generateRandomString,
    generateUniqueId,
    slugify,
    capitalizeWords,
    
    // Validation
    isValidEmail,
    isValidPhone,
    sanitizeString,
    
    // Object
    removeNullValues,
    pick,
    omit,
    
    // File
    getFileExtension,
    generateUniqueFilename
};