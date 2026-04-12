/**
 * Admin Routes Module
 * Defines all routes for admin operations
 */

const express = require('express');
const router = express.Router();

// Import controller
const adminController = require('../controllers/adminController');

// Import middleware
const { verifyToken, verifyAdmin, verifySuperAdmin } = require('../middleware/auth');
const {
    adminLoginValidation,
    adminCreateValidation,
    roomCreateValidation,
    roomUpdateValidation,
    blockCreateValidation,
    applicationUpdateValidation,
    allocationCreateValidation,
    idParamValidation,
    paginationValidation
} = require('../middleware/validation');

// =====================================================
// Public Routes (No authentication required)
// =====================================================

/**
 * @route   POST /api/admin/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/login', adminLoginValidation, adminController.login);

// =====================================================
// Protected Routes (Admin authentication required)
// =====================================================

// Apply authentication middleware to all routes below
router.use(verifyToken, verifyAdmin);

// --------------------
// Profile Routes
// --------------------

/**
 * @route   GET /api/admin/profile
 * @desc    Get admin profile
 * @access  Private (Admin)
 */
router.get('/profile', adminController.getProfile);

// --------------------
// Dashboard Routes
// --------------------

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin)
 */
router.get('/dashboard', adminController.getDashboard);

// --------------------
// Admin Management Routes (Super Admin Only)
// --------------------

/**
 * @route   POST /api/admin/create
 * @desc    Create new admin
 * @access  Private (Super Admin)
 */
router.post('/create', verifySuperAdmin, adminCreateValidation, adminController.createAdmin);

// --------------------
// Student Management Routes
// --------------------

/**
 * @route   GET /api/admin/students
 * @desc    Get all students
 * @access  Private (Admin)
 */
router.get('/students', paginationValidation, adminController.getAllStudents);

/**
 * @route   GET /api/admin/students/:id
 * @desc    Get student by ID
 * @access  Private (Admin)
 */
router.get('/students/:id', idParamValidation, adminController.getStudentById);

/**
 * @route   PUT /api/admin/students/:id
 * @desc    Update student
 * @access  Private (Admin)
 */
router.put('/students/:id', idParamValidation, adminController.updateStudent);

/**
 * @route   DELETE /api/admin/students/:id
 * @desc    Delete/Deactivate student
 * @access  Private (Admin)
 */
router.delete('/students/:id', idParamValidation, adminController.deleteStudent);

// --------------------
// Hostel Block Routes
// --------------------

/**
 * @route   GET /api/admin/blocks
 * @desc    Get all hostel blocks
 * @access  Private (Admin)
 */
router.get('/blocks', adminController.getAllBlocks);

/**
 * @route   POST /api/admin/blocks
 * @desc    Create new hostel block
 * @access  Private (Admin)
 */
router.post('/blocks', blockCreateValidation, adminController.createBlock);

/**
 * @route   PUT /api/admin/blocks/:id
 * @desc    Update hostel block
 * @access  Private (Admin)
 */
router.put('/blocks/:id', idParamValidation, adminController.updateBlock);

/**
 * @route   DELETE /api/admin/blocks/:id
 * @desc    Delete hostel block
 * @access  Private (Admin)
 */
router.delete('/blocks/:id', idParamValidation, adminController.deleteBlock);

// --------------------
// Room Management Routes
// --------------------

/**
 * @route   GET /api/admin/rooms
 * @desc    Get all rooms
 * @access  Private (Admin)
 */
router.get('/rooms', paginationValidation, adminController.getAllRooms);

/**
 * @route   GET /api/admin/rooms/:id
 * @desc    Get room by ID with occupants
 * @access  Private (Admin)
 */
router.get('/rooms/:id', idParamValidation, adminController.getRoomById);

/**
 * @route   POST /api/admin/rooms
 * @desc    Create new room
 * @access  Private (Admin)
 */
router.post('/rooms', roomCreateValidation, adminController.createRoom);

/**
 * @route   PUT /api/admin/rooms/:id
 * @desc    Update room
 * @access  Private (Admin)
 */
router.put('/rooms/:id', idParamValidation, roomUpdateValidation, adminController.updateRoom);

/**
 * @route   DELETE /api/admin/rooms/:id
 * @desc    Delete room
 * @access  Private (Admin)
 */
router.delete('/rooms/:id', idParamValidation, adminController.deleteRoom);

// --------------------
// Application Management Routes
// --------------------

/**
 * @route   GET /api/admin/applications
 * @desc    Get all applications
 * @access  Private (Admin)
 */
router.get('/applications', paginationValidation, adminController.getAllApplications);

/**
 * @route   PUT /api/admin/applications/:id/process
 * @desc    Process application (approve/reject)
 * @access  Private (Admin)
 */
router.put('/applications/:id/process', idParamValidation, applicationUpdateValidation, adminController.processApplication);

// --------------------
// Room Allocation Routes
// --------------------

/**
 * @route   GET /api/admin/allocations
 * @desc    Get all allocations
 * @access  Private (Admin)
 */
router.get('/allocations', paginationValidation, adminController.getAllAllocations);

/**
 * @route   POST /api/admin/allocations
 * @desc    Create room allocation
 * @access  Private (Admin)
 */
router.post('/allocations', allocationCreateValidation, adminController.createAllocation);

/**
 * @route   PUT /api/admin/allocations/:id
 * @desc    Update allocation
 * @access  Private (Admin)
 */
router.put('/allocations/:id', idParamValidation, adminController.updateAllocation);

/**
 * @route   PUT /api/admin/allocations/:id/terminate
 * @desc    Terminate allocation
 * @access  Private (Admin)
 */
router.put('/allocations/:id/terminate', idParamValidation, adminController.terminateAllocation);

// --------------------
// Report Routes
// --------------------

/**
 * @route   GET /api/admin/reports/occupancy
 * @desc    Get occupancy report
 * @access  Private (Admin)
 */
router.get('/reports/occupancy', adminController.getOccupancyReport);

/**
 * @route   GET /api/admin/reports/students
 * @desc    Get student statistics
 * @access  Private (Admin)
 */
router.get('/reports/students', adminController.getStudentStatistics);

// =====================================================
// Export Router
// =====================================================

module.exports = router;