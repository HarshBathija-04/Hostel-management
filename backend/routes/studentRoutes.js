const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
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
router.post('/register', studentRegistrationValidation, studentController.register);
router.post('/login', studentLoginValidation, studentController.login);
// Everything below requires a student token.
router.use(verifyToken, verifyStudent);
router.get('/profile', studentController.getProfile);
router.put('/profile', studentUpdateValidation, studentController.updateProfile);
router.put('/change-password', changePasswordValidation, studentController.changePassword);
router.post('/applications', applicationCreateValidation, studentController.submitApplication);
router.get('/applications', studentController.getMyApplications);
router.get('/applications/:id', idParamValidation, studentController.getApplicationById);
router.put('/applications/:id/cancel', idParamValidation, studentController.cancelApplication);
router.get('/allocation', studentController.getMyAllocation);
router.get('/allocation-history', studentController.getAllocationHistory);
router.get('/dashboard', studentController.getDashboard);
router.get('/available-rooms', availableRoomsValidation, studentController.getAvailableRooms);
router.get('/blocks', studentController.getBlocks);

router.get('/payments', studentController.getMyPayments);
router.get('/complaints', studentController.getMyComplaints);
router.post('/complaints', complaintCreateValidation, studentController.createComplaint);

module.exports = router;