/**
 * Validation Middleware Module
 * Handles input validation using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg
            }))
        });
    }
    
    next();
};

// =====================================================
// Student Validations
// =====================================================

const studentRegistrationValidation = [
    body('studentId')
        .trim()
        .notEmpty().withMessage('Student ID is required')
        .isLength({ min: 5, max: 20 }).withMessage('Student ID must be 5-20 characters')
        .matches(/^[A-Za-z0-9]+$/).withMessage('Student ID must be alphanumeric'),
    
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .toLowerCase(),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
    body('firstName')
        .trim()
        .notEmpty().withMessage('First name is required')
        .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters')
        .matches(/^[A-Za-z\s]+$/).withMessage('First name must contain only letters'),
    
    body('lastName')
        .trim()
        .notEmpty().withMessage('Last name is required')
        .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters')
        .matches(/^[A-Za-z\s]+$/).withMessage('Last name must contain only letters'),
    
    body('dateOfBirth')
        .optional()
        .isISO8601().withMessage('Invalid date format')
        .custom((value) => {
            const dob = new Date(value);
            const today = new Date();
            const age = today.getFullYear() - dob.getFullYear();
            if (age < 16 || age > 60) {
                throw new Error('Age must be between 16 and 60 years');
            }
            return true;
        }),
    
    body('gender')
        .notEmpty().withMessage('Gender is required')
        .isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
    
    body('phone')
        .optional({ values: 'falsy' })
        .trim()
        .matches(/^[0-9]{10,15}$/).withMessage('Phone number must be 10-15 digits'),
    
    body('course')
        .trim()
        .notEmpty().withMessage('Course is required')
        .isLength({ min: 2, max: 100 }).withMessage('Course must be 2-100 characters'),
    
    body('department')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Department must not exceed 100 characters'),
    
    body('yearOfStudy')
        .notEmpty().withMessage('Year of study is required')
        .isInt({ min: 1, max: 6 }).withMessage('Year of study must be between 1 and 6'),
    
    body('address')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),
    
    body('emergencyContactName')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Emergency contact name must not exceed 100 characters'),
    
    body('emergencyContactPhone')
        .optional({ values: 'falsy' })
        .trim()
        .matches(/^[0-9]{10,15}$/).withMessage('Emergency contact phone must be 10-15 digits'),
    
    handleValidationErrors
];

const studentLoginValidation = [
    body('studentId')
        .trim()
        .notEmpty().withMessage('Student ID is required'),
    
    body('password')
        .notEmpty().withMessage('Password is required'),
    
    handleValidationErrors
];

const studentUpdateValidation = [
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters')
        .matches(/^[A-Za-z\s]+$/).withMessage('First name must contain only letters'),
    
    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters')
        .matches(/^[A-Za-z\s]+$/).withMessage('Last name must contain only letters'),
    
    body('phone')
        .optional({ values: 'falsy' })
        .trim()
        .matches(/^[0-9]{10,15}$/).withMessage('Phone number must be 10-15 digits'),
    
    body('address')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),
    
    body('emergencyContactName')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Emergency contact name must not exceed 100 characters'),
    
    body('emergencyContactPhone')
        .optional({ values: 'falsy' })
        .trim()
        .matches(/^[0-9]{10,15}$/).withMessage('Emergency contact phone must be 10-15 digits'),
    
    handleValidationErrors
];

// =====================================================
// Admin Validations
// =====================================================

const adminLoginValidation = [
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required'),
    
    body('password')
        .notEmpty().withMessage('Password is required'),
    
    handleValidationErrors
];

const adminCreateValidation = [
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters')
        .matches(/^[A-Za-z0-9_]+$/).withMessage('Username must be alphanumeric with underscores'),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .toLowerCase(),
    
    body('fullName')
        .trim()
        .notEmpty().withMessage('Full name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters'),
    
    body('phone')
        .optional({ values: 'falsy' })
        .trim()
        .matches(/^[0-9]{10,15}$/).withMessage('Phone number must be 10-15 digits'),
    
    body('role')
        .optional()
        .isIn(['admin', 'super_admin']).withMessage('Role must be admin or super_admin'),
    
    handleValidationErrors
];

// =====================================================
// Room Validations
// =====================================================

const roomCreateValidation = [
    body('roomNumber')
        .trim()
        .notEmpty().withMessage('Room number is required')
        .isLength({ max: 20 }).withMessage('Room number must not exceed 20 characters'),
    
    body('blockId')
        .notEmpty().withMessage('Block ID is required')
        .isInt({ min: 1 }).withMessage('Block ID must be a positive integer'),
    
    body('floorNumber')
        .optional()
        .isInt({ min: 0 }).withMessage('Floor number must be a non-negative integer'),
    
    body('roomType')
        .optional()
        .isIn(['single', 'double', 'triple', 'quad']).withMessage('Invalid room type'),
    
    body('capacity')
        .notEmpty().withMessage('Capacity is required')
        .isInt({ min: 1, max: 10 }).withMessage('Capacity must be between 1 and 10'),
    
    body('facilities')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Facilities must not exceed 500 characters'),
    
    body('monthlyRent')
        .optional()
        .isDecimal({ decimal_digits: '0,2' }).withMessage('Monthly rent must be a valid decimal'),
    
    handleValidationErrors
];

const roomUpdateValidation = [
    body('roomNumber')
        .optional()
        .trim()
        .isLength({ max: 20 }).withMessage('Room number must not exceed 20 characters'),
    
    body('floorNumber')
        .optional()
        .isInt({ min: 0 }).withMessage('Floor number must be a non-negative integer'),
    
    body('roomType')
        .optional()
        .isIn(['single', 'double', 'triple', 'quad']).withMessage('Invalid room type'),
    
    body('capacity')
        .optional()
        .isInt({ min: 1, max: 10 }).withMessage('Capacity must be between 1 and 10'),
    
    body('facilities')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Facilities must not exceed 500 characters'),
    
    body('monthlyRent')
        .optional()
        .isDecimal({ decimal_digits: '0,2' }).withMessage('Monthly rent must be a valid decimal'),
    
    body('roomStatus')
        .optional()
        .isIn(['available', 'full', 'maintenance', 'reserved']).withMessage('Invalid room status'),
    
    handleValidationErrors
];

// =====================================================
// Hostel Block Validations
// =====================================================

const blockCreateValidation = [
    body('blockName')
        .trim()
        .notEmpty().withMessage('Block name is required')
        .isLength({ max: 50 }).withMessage('Block name must not exceed 50 characters'),
    
    body('blockCode')
        .trim()
        .notEmpty().withMessage('Block code is required')
        .isLength({ max: 10 }).withMessage('Block code must not exceed 10 characters')
        .matches(/^[A-Za-z0-9]+$/).withMessage('Block code must be alphanumeric'),
    
    body('genderType')
        .notEmpty().withMessage('Gender type is required')
        .isIn(['male', 'female', 'mixed']).withMessage('Gender type must be male, female, or mixed'),
    
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
    
    body('totalFloors')
        .optional()
        .isInt({ min: 1, max: 20 }).withMessage('Total floors must be between 1 and 20'),
    
    body('wardenName')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Warden name must not exceed 100 characters'),
    
    body('wardenContact')
        .optional()
        .trim()
        .matches(/^[0-9]{10,15}$/).withMessage('Warden contact must be 10-15 digits'),
    
    handleValidationErrors
];

// =====================================================
// Room Application Validations
// =====================================================

const applicationCreateValidation = [
    body('preferredBlockId')
        .optional()
        .isInt({ min: 1 }).withMessage('Preferred block ID must be a positive integer'),
    
    body('preferredRoomType')
        .optional()
        .isIn(['single', 'double', 'triple', 'quad', 'any']).withMessage('Invalid room type'),
    
    body('preferredStartDate')
        .notEmpty().withMessage('Preferred start date is required')
        .isISO8601().withMessage('Invalid date format')
        .custom((value) => {
            const startDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (startDate < today) {
                throw new Error('Start date cannot be in the past');
            }
            return true;
        }),
    
    body('durationMonths')
        .optional()
        .isInt({ min: 1, max: 24 }).withMessage('Duration must be between 1 and 24 months'),
    
    body('specialRequirements')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Special requirements must not exceed 500 characters'),
    
    handleValidationErrors
];

const applicationUpdateValidation = [
    body('status')
        .notEmpty().withMessage('Status is required')
        .isIn(['approved', 'rejected', 'waitlisted']).withMessage('Status must be approved, rejected or waitlisted'),

    body('adminRemarks')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Admin remarks must not exceed 500 characters'),
    
    handleValidationErrors
];

// =====================================================
// Room Allocation Validations
// =====================================================

const allocationCreateValidation = [
    body('studentId')
        .notEmpty().withMessage('Student ID is required')
        .isInt({ min: 1 }).withMessage('Student ID must be a positive integer'),
    
    body('roomId')
        .notEmpty().withMessage('Room ID is required')
        .isInt({ min: 1 }).withMessage('Room ID must be a positive integer'),
    
    body('applicationId')
        .optional()
        .isInt({ min: 1 }).withMessage('Application ID must be a positive integer'),
    
    body('bedNumber')
        .optional()
        .isInt({ min: 1, max: 10 }).withMessage('Bed number must be between 1 and 10'),
    
    body('startDate')
        .notEmpty().withMessage('Start date is required')
        .isISO8601().withMessage('Invalid date format'),
    
    body('endDate')
        .optional()
        .isISO8601().withMessage('Invalid date format')
        .custom((value, { req }) => {
            if (value && new Date(value) <= new Date(req.body.startDate)) {
                throw new Error('End date must be after start date');
            }
            return true;
        }),
    
    body('rentAmount')
        .optional()
        .isDecimal({ decimal_digits: '0,2' }).withMessage('Rent amount must be a valid decimal'),
    
    body('securityDeposit')
        .optional()
        .isDecimal({ decimal_digits: '0,2' }).withMessage('Security deposit must be a valid decimal'),
    
    handleValidationErrors
];

// =====================================================
// Common Validations
// =====================================================

const idParamValidation = [
    param('id')
        .isInt({ min: 1 }).withMessage('ID must be a positive integer'),
    handleValidationErrors
];

const paginationValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    
    query('search')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Search query must not exceed 100 characters'),
    
    query('sortBy')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Sort by field must not exceed 50 characters'),
    
    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),

    query(['blockId', 'roomId', 'studentId', 'year'])
        .optional()
        .isInt({ min: 1 }).withMessage('Must be a positive integer'),

    query(['status', 'roomType', 'gender', 'category'])
        .optional()
        .matches(/^[a-z_]{1,20}$/).withMessage('Invalid filter value'),

    query('course')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Course must not exceed 100 characters'),

    handleValidationErrors
];

const optionalText = (field, max) => body(field).optional({ values: 'null' }).trim().isLength({ max })
    .withMessage(`${field} must not exceed ${max} characters`);
const optionalPhone = (field) => body(field).optional({ values: 'falsy' }).trim().matches(/^[0-9]{10,15}$/)
    .withMessage(`${field} must be 10-15 digits`);

const changePasswordValidation = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 8, max: 72 }).withMessage('New password must be 8-72 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('New password needs an uppercase letter, a lowercase letter and a number'),
    handleValidationErrors
];

const adminStudentUpdateValidation = [
    body(['firstName', 'lastName']).optional().trim().isLength({ min: 2, max: 50 }).withMessage('Names must be 2-50 characters'),
    optionalPhone('phone'),
    optionalPhone('emergencyContactPhone'),
    optionalText('address', 500),
    optionalText('course', 100),
    optionalText('department', 100),
    optionalText('emergencyContactName', 100),
    body('yearOfStudy').optional().isInt({ min: 1, max: 6 }).withMessage('Year of study must be between 1 and 6').toInt(),
    body('isActive').optional().isBoolean().withMessage('isActive must be true or false').toBoolean(),
    handleValidationErrors
];

const blockUpdateValidation = [
    body('blockName').optional().trim().notEmpty().isLength({ max: 50 }).withMessage('Block name must be 1-50 characters'),
    body('genderType').optional().isIn(['male', 'female', 'mixed']).withMessage('Gender type must be male, female, or mixed'),
    optionalText('description', 500),
    body('totalFloors').optional().isInt({ min: 1, max: 20 }).withMessage('Total floors must be between 1 and 20').toInt(),
    optionalText('wardenName', 100),
    optionalPhone('wardenContact'),
    body('isActive').optional().isBoolean().withMessage('isActive must be true or false').toBoolean(),
    handleValidationErrors
];

const allocationUpdateValidation = [
    body('endDate').optional().isISO8601().withMessage('Invalid date format'),
    body('rentAmount').optional().isDecimal({ decimal_digits: '0,2' }).withMessage('Rent amount must be a valid decimal'),
    body('paymentStatus').optional().isIn(['pending', 'partial', 'paid', 'refunded']).withMessage('Invalid payment status'),
    body('allocationStatus').optional().isIn(['active', 'expired', 'terminated', 'extended']).withMessage('Invalid allocation status'),
    optionalText('terminationReason', 500),
    handleValidationErrors
];

const terminateValidation = [optionalText('reason', 500), handleValidationErrors];

const paymentCreateValidation = [
    body('allocationId').isInt({ min: 1 }).withMessage('Allocation ID must be a positive integer').toInt(),
    body('amount').isFloat({ gt: 0, max: 1000000 }).withMessage('Amount must be greater than 0').toFloat(),
    body('paymentType').optional().isIn(['rent', 'security_deposit', 'fine', 'other']).withMessage('Invalid payment type'),
    body('paymentMethod').isIn(['cash', 'card', 'bank_transfer', 'online']).withMessage('Invalid payment method'),
    body('monthYear').optional({ values: 'falsy' }).matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('Month must be YYYY-MM'),
    optionalText('transactionId', 100),
    optionalText('remarks', 500),
    handleValidationErrors
];

const paymentCompleteValidation = [
    body('paymentMethod').optional().isIn(['cash', 'card', 'bank_transfer', 'online']).withMessage('Invalid payment method'),
    optionalText('transactionId', 100),
    handleValidationErrors
];

const COMPLAINT_CATEGORIES = ['electrical', 'plumbing', 'furniture', 'cleaning', 'internet', 'other'];

const complaintCreateValidation = [
    body('category').isIn(COMPLAINT_CATEGORIES).withMessage('Invalid category'),
    body('title').trim().isLength({ min: 3, max: 120 }).withMessage('Title must be 3-120 characters'),
    body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium or high'),
    handleValidationErrors
];

const complaintUpdateValidation = [
    body('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium or high'),
    optionalText('adminResponse', 1000),
    handleValidationErrors
];

const availableRoomsValidation = [
    query('blockId').optional().isInt({ min: 1 }).withMessage('Block ID must be a positive integer'),
    query('roomType').optional().isIn(['single', 'double', 'triple', 'quad']).withMessage('Invalid room type'),
    handleValidationErrors
];

module.exports = {
    changePasswordValidation,
    adminStudentUpdateValidation,
    blockUpdateValidation,
    allocationUpdateValidation,
    terminateValidation,
    paymentCreateValidation,
    paymentCompleteValidation,
    complaintCreateValidation,
    complaintUpdateValidation,
    availableRoomsValidation,
    handleValidationErrors,
    studentRegistrationValidation,
    studentLoginValidation,
    studentUpdateValidation,
    adminLoginValidation,
    adminCreateValidation,
    roomCreateValidation,
    roomUpdateValidation,
    blockCreateValidation,
    applicationCreateValidation,
    applicationUpdateValidation,
    allocationCreateValidation,
    idParamValidation,
    paginationValidation
};