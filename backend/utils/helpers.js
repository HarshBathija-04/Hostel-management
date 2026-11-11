/**
 * Shared helpers: password hashing, JWT issuing, JSON responses and pagination.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const hashPassword = (password) => bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS, 10) || 10);

const comparePassword = (password, hashedPassword) => bcrypt.compare(password, hashedPassword);

/** Issue the access token the frontend sends as `Authorization: Bearer <token>`. */
const generateTokens = (user) => ({
    accessToken: jwt.sign(
        { id: user.id, userType: user.userType, email: user.email, role: user.role || null },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
    )
});

const sendSuccess = (res, message = 'Success', data = null, statusCode = 200) =>
    res.status(statusCode).json({ success: true, message, ...(data !== null && { data }) });

const sendError = (res, message = 'Error occurred', statusCode = 500, errors = null) =>
    res.status(statusCode).json({ success: false, message, ...(errors !== null && { errors }) });

const createPagination = (page, limit, total) => {
    const totalPages = Math.ceil(total / limit);
    return {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
    };
};

const getPaginationParams = (req) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    return { page, limit, offset: (page - 1) * limit };
};

// DEMO_MODE=true protects the shared demo login from being locked out by visitors.
const isDemoAccount = (studentCode) => process.env.DEMO_MODE === 'true' && studentCode === 'STU2024001';

const omit = (obj, keys) => Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key)));

module.exports = {
    hashPassword,
    comparePassword,
    generateTokens,
    sendSuccess,
    sendError,
    createPagination,
    getPaginationParams,
    omit,
    isDemoAccount
};
