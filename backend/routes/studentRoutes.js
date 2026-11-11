/**
 * Student Routes Module
 * Defines all routes for student operations
 */

const express = require('express');
const router = express.Router();

// Import controller
const studentController = require('../controllers/studentController');

// Import middleware
const { verifyToken, verifyStudent } = require('../middleware/auth');
const {
    studentRegistrationValidation,
    studentLoginValidation,
    studentUpdateValidation,
    applicationCreateValidation,
    changePasswordValidation,
    availableRoomsValidation,
    complaintCreateValidation,
    idParamValidation
} = require('../middleware/validation');

// =====================================================
// Public Routes (No authentication required)
// =====================================================

/**
 * @route   POST /api/students/register
 * @desc    Register a new student
 * @access  Public
 */
router.post('/register', studentRegistrationValidation, studentController.register);

/**
 * @route   POST /api/students/login
 * @desc    Student login
 * @access  Public
 */
router.post('/login', studentLoginValidation, studentController.login);

// =====================================================
// Protected Routes (Student authentication required)
// =====================================================

// Apply authentication middleware to all routes below
router.use(verifyToken, verifyStudent);

// --------------------
// Profile Routes
// --------------------

/**
 * @route   GET /api/students/profile
 * @desc    Get student profile
 * @access  Private (Student)
 */
router.get('/profile', studentController.getProfile);

/**
 * @route   PUT /api/students/profile
 * @desc    Update student profile
 * @access  Private (Student)
 */
router.put('/profile', studentUpdateValidation, studentController.updateProfile);

/**
 * @route   PUT /api/students/change-password
 * @desc    Change student password
 * @access  Private (Student)
 */
router.put('/change-password', changePasswordValidation, studentController.changePassword);

// --------------------
// Application Routes
// --------------------

/**
 * @route   POST /api/students/applications
 * @desc    Submit room application
 * @access  Private (Student)
 */
router.post('/applications', applicationCreateValidation, studentController.submitApplication);

/**
 * @route   GET /api/students/applications
 * @desc    Get all applications by student
 * @access  Private (Student)
 */
router.get('/applications', studentController.getMyApplications);

/**
 * @route   GET /api/students/applications/:id
 * @desc    Get application by ID
 * @access  Private (Student)
 */
router.get('/applications/:id', idParamValidation, studentController.getApplicationById);

/**
 * @route   PUT /api/students/applications/:id/cancel
 * @desc    Cancel an application
 * @access  Private (Student)
 */
router.put('/applications/:id/cancel', idParamValidation, studentController.cancelApplication);

// --------------------
// Allocation Routes
// --------------------

/**
 * @route   GET /api/students/allocation
 * @desc    Get current room allocation
 * @access  Private (Student)
 */
router.get('/allocation', studentController.getMyAllocation);

/**
 * @route   GET /api/students/allocation-history
 * @desc    Get allocation history
 * @access  Private (Student)
 */
router.get('/allocation-history', studentController.getAllocationHistory);

// --------------------
// Dashboard & Info Routes
// --------------------

/**
 * @route   GET /api/students/dashboard
 * @desc    Get student dashboard data
 * @access  Private (Student)
 */
router.get('/dashboard', studentController.getDashboard);

/**
 * @route   GET /api/students/available-rooms
 * @desc    Get available rooms
 * @access  Private (Student)
 */
router.get('/available-rooms', availableRoomsValidation, studentController.getAvailableRooms);

/**
 * @route   GET /api/students/blocks
 * @desc    Get all hostel blocks
 * @access  Private (Student)
 */
router.get('/blocks', studentController.getBlocks);

// --------------------
// Fees & Complaints
// --------------------

router.get('/payments', studentController.getMyPayments);
router.get('/complaints', studentController.getMyComplaints);
router.post('/complaints', complaintCreateValidation, studentController.createComplaint);

// =====================================================
// Export Router
// =====================================================

module.exports = router;