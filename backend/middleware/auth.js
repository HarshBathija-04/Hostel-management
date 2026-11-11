/**
 * JWT authentication and role checks.
 */
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    try {
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
        req.user = { id: decoded.id, userType: decoded.userType, email: decoded.email, role: decoded.role || null };
        return next();
    } catch (error) {
        const message = error.name === 'TokenExpiredError'
            ? 'Your session has expired. Please log in again.'
            : 'Invalid token. Please log in again.';
        return res.status(401).json({ success: false, message });
    }
};

const requireUserType = (userType) => (req, res, next) =>
    req.user.userType === userType
        ? next()
        : res.status(403).json({ success: false, message: `Access denied. ${userType === 'admin' ? 'Admin' : 'Student'} access required.` });

const verifyStudent = requireUserType('student');
const verifyAdmin = requireUserType('admin');

const verifySuperAdmin = (req, res, next) =>
    req.user.userType === 'admin' && req.user.role === 'super_admin'
        ? next()
        : res.status(403).json({ success: false, message: 'Access denied. Super admin access required.' });

module.exports = { verifyToken, verifyStudent, verifyAdmin, verifySuperAdmin };
