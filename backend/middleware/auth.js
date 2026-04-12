/**
 * Authentication Middleware Module
 * Handles JWT verification, role-based access control, and authentication checks
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * Verify JWT token from request headers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const verifyToken = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach user info to request object
        req.user = {
            id: decoded.id,
            userType: decoded.userType,
            email: decoded.email,
            role: decoded.role || null
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please login again.'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Please login again.'
            });
        }

        console.error('Auth Middleware Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error occurred'
        });
    }
};

/**
 * Verify if user is a student
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const verifyStudent = (req, res, next) => {
    if (req.user.userType !== 'student') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Student access required.'
        });
    }
    next();
};

/**
 * Verify if user is an admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const verifyAdmin = (req, res, next) => {
    if (req.user.userType !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin access required.'
        });
    }
    next();
};

/**
 * Verify if user is a super admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const verifySuperAdmin = (req, res, next) => {
    if (req.user.userType !== 'admin' || req.user.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Super admin access required.'
        });
    }
    next();
};

/**
 * Check if user has required role
 * @param {Array} allowedRoles - Array of allowed roles
 * @returns {Function} - Express middleware function
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user.role || req.user.userType;
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }
        next();
    };
};

/**
 * Optional authentication - doesn't fail if no token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            req.user = {
                id: decoded.id,
                userType: decoded.userType,
                email: decoded.email,
                role: decoded.role || null
            };
        }
        
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

/**
 * Check if student owns the resource or is admin
 * @param {string} paramName - Request parameter name containing student ID
 * @returns {Function} - Express middleware function
 */
const verifyOwnership = (paramName = 'studentId') => {
    return (req, res, next) => {
        const resourceStudentId = parseInt(req.params[paramName]);
        const currentUser = req.user;

        // Admin can access any resource
        if (currentUser.userType === 'admin') {
            return next();
        }

        // Student can only access their own resources
        if (currentUser.userType === 'student' && currentUser.id === resourceStudentId) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Access denied. You can only access your own resources.'
        });
    };
};

/**
 * Refresh access token using refresh token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Generate new access token
        const newAccessToken = jwt.sign(
            {
                id: decoded.id,
                userType: decoded.userType,
                email: decoded.email,
                role: decoded.role
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '24h' }
        );

        return res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                accessToken: newAccessToken
            }
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Refresh token has expired. Please login again.'
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
};

/**
 * Logout user by blacklisting token (optional implementation)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logout = async (req, res) => {
    try {
        // In a production environment, you might want to:
        // 1. Add token to a blacklist in Redis/database
        // 2. Clear any session data
        // 3. Update last logout time
        
        return res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error during logout'
        });
    }
};

module.exports = {
    verifyToken,
    verifyStudent,
    verifyAdmin,
    verifySuperAdmin,
    requireRole,
    optionalAuth,
    verifyOwnership,
    refreshToken,
    logout
};