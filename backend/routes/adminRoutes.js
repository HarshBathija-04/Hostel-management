const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, verifyAdmin, verifySuperAdmin } = require('../middleware/auth');
const {
    adminLoginValidation,
    adminCreateValidation,
    roomCreateValidation,
    roomUpdateValidation,
    blockCreateValidation,
    applicationUpdateValidation,
    allocationCreateValidation,
    adminStudentUpdateValidation,
    blockUpdateValidation,
    allocationUpdateValidation,
    terminateValidation,
    paymentCreateValidation,
    paymentCompleteValidation,
    complaintUpdateValidation,
    idParamValidation,
    paginationValidation
} = require('../middleware/validation');
router.post('/login', adminLoginValidation, adminController.login);
// Everything below requires an admin token.
router.use(verifyToken, verifyAdmin);
router.get('/profile', adminController.getProfile);
router.get('/dashboard', adminController.getDashboard);
router.post('/create', verifySuperAdmin, adminCreateValidation, adminController.createAdmin);
router.get('/students', paginationValidation, adminController.getAllStudents);
router.get('/students/:id', idParamValidation, adminController.getStudentById);
router.put('/students/:id', idParamValidation, adminStudentUpdateValidation, adminController.updateStudent);
router.delete('/students/:id', idParamValidation, adminController.deleteStudent);
router.get('/blocks', adminController.getAllBlocks);
router.post('/blocks', blockCreateValidation, adminController.createBlock);
router.put('/blocks/:id', idParamValidation, blockUpdateValidation, adminController.updateBlock);
router.delete('/blocks/:id', idParamValidation, adminController.deleteBlock);
router.get('/rooms', paginationValidation, adminController.getAllRooms);
router.get('/rooms/:id', idParamValidation, adminController.getRoomById);
router.post('/rooms', roomCreateValidation, adminController.createRoom);
router.put('/rooms/:id', idParamValidation, roomUpdateValidation, adminController.updateRoom);
router.delete('/rooms/:id', idParamValidation, adminController.deleteRoom);
router.get('/applications', paginationValidation, adminController.getAllApplications);
router.put('/applications/:id/process', idParamValidation, applicationUpdateValidation, adminController.processApplication);
router.get('/allocations', paginationValidation, adminController.getAllAllocations);
router.post('/allocations', allocationCreateValidation, adminController.createAllocation);
router.put('/allocations/:id', idParamValidation, allocationUpdateValidation, adminController.updateAllocation);
router.put('/allocations/:id/terminate', idParamValidation, terminateValidation, adminController.terminateAllocation);
router.get('/reports/occupancy', paginationValidation, adminController.getOccupancyReport);
router.get('/reports/students', adminController.getStudentStatistics);

router.get('/payments', paginationValidation, adminController.getAllPayments);
router.post('/payments', paymentCreateValidation, adminController.recordPayment);
router.put('/payments/:id/complete', idParamValidation, paymentCompleteValidation, adminController.completePayment);
router.get('/complaints', paginationValidation, adminController.getAllComplaints);
router.put('/complaints/:id', idParamValidation, complaintUpdateValidation, adminController.updateComplaint);

module.exports = router;