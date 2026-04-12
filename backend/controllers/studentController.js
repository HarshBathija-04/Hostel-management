/**
 * Student Controller Module
 * Handles all student-related operations including registration, login, profile management, and applications
 */

const { query, transaction } = require('../config/database');
const { 
    hashPassword, 
    comparePassword, 
    generateTokens, 
    sendSuccess, 
    sendError,
    formatDate,
    getPaginationParams,
    createPagination,
    omit
} = require('../utils/helpers');

// =====================================================
// Authentication Controllers
// =====================================================

/**
 * Register a new student
 * POST /api/students/register
 */
const register = async (req, res) => {
    try {
        const {
            studentId,
            email,
            password,
            firstName,
            lastName,
            dateOfBirth,
            gender,
            phone,
            address,
            course,
            department,
            yearOfStudy,
            emergencyContactName,
            emergencyContactPhone
        } = req.body;

        // Check if student ID already exists
        const existingStudent = await query(
            'SELECT id FROM students WHERE student_id = ? OR email = ?',
            [studentId, email]
        );

        if (existingStudent.length > 0) {
            return sendError(res, 'Student ID or email already exists', 409);
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Insert new student
        const result = await query(
            `INSERT INTO students (
                student_id, email, password, first_name, last_name, 
                date_of_birth, gender, phone, address, course, 
                department, year_of_study, emergency_contact_name, emergency_contact_phone
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                studentId, email, hashedPassword, firstName, lastName,
                dateOfBirth || null, gender, phone || null, address || null, course,
                department || null, yearOfStudy, emergencyContactName || null, emergencyContactPhone || null
            ]
        );

        // Get the created student (without password)
        const newStudent = await query(
            `SELECT id, student_id, email, first_name, last_name, gender, course, year_of_study, created_at 
             FROM students WHERE id = ?`,
            [result.insertId]
        );

        // Generate tokens
        const tokens = generateTokens({
            id: result.insertId,
            userType: 'student',
            email,
            role: null
        });

        return sendSuccess(res, 'Student registered successfully', {
            student: newStudent[0],
            ...tokens
        }, 201);

    } catch (error) {
        console.error('Student Registration Error:', error);
        return sendError(res, 'Failed to register student', 500);
    }
};

/**
 * Student login
 * POST /api/students/login
 */
const login = async (req, res) => {
    try {
        const { studentId, password } = req.body;

        // Find student by student ID
        const students = await query(
            `SELECT id, student_id, email, password, first_name, last_name, 
                    gender, course, year_of_study, is_active, profile_image
             FROM students WHERE student_id = ?`,
            [studentId]
        );

        if (students.length === 0) {
            return sendError(res, 'Invalid student ID or password', 401);
        }

        const student = students[0];

        // Check if account is active
        if (!student.is_active) {
            return sendError(res, 'Your account has been deactivated. Please contact admin.', 403);
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, student.password);

        if (!isPasswordValid) {
            return sendError(res, 'Invalid student ID or password', 401);
        }

        // Update last login time
        await query(
            'UPDATE students SET last_login = NOW() WHERE id = ?',
            [student.id]
        );

        // Generate tokens
        const tokens = generateTokens({
            id: student.id,
            userType: 'student',
            email: student.email,
            role: null
        });

        // Remove password from response
        const studentData = omit(student, ['password']);

        return sendSuccess(res, 'Login successful', {
            student: studentData,
            ...tokens
        });

    } catch (error) {
        console.error('Student Login Error:', error);
        return sendError(res, 'Login failed', 500);
    }
};

/**
 * Get current student profile
 * GET /api/students/profile
 */
const getProfile = async (req, res) => {
    try {
        const studentId = req.user.id;

        const students = await query(
            `SELECT id, student_id, email, first_name, last_name, date_of_birth,
                    gender, phone, address, course, department, year_of_study,
                    enrollment_date, emergency_contact_name, emergency_contact_phone,
                    profile_image, is_active, email_verified, created_at, last_login
             FROM students WHERE id = ?`,
            [studentId]
        );

        if (students.length === 0) {
            return sendError(res, 'Student not found', 404);
        }

        return sendSuccess(res, 'Profile retrieved successfully', students[0]);

    } catch (error) {
        console.error('Get Profile Error:', error);
        return sendError(res, 'Failed to retrieve profile', 500);
    }
};

/**
 * Update student profile
 * PUT /api/students/profile
 */
const updateProfile = async (req, res) => {
    try {
        const studentId = req.user.id;
        const {
            firstName,
            lastName,
            phone,
            address,
            emergencyContactName,
            emergencyContactPhone
        } = req.body;

        // Check if student exists
        const existingStudent = await query(
            'SELECT id FROM students WHERE id = ?',
            [studentId]
        );

        if (existingStudent.length === 0) {
            return sendError(res, 'Student not found', 404);
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (firstName !== undefined) {
            updates.push('first_name = ?');
            values.push(firstName);
        }
        if (lastName !== undefined) {
            updates.push('last_name = ?');
            values.push(lastName);
        }
        if (phone !== undefined) {
            updates.push('phone = ?');
            values.push(phone);
        }
        if (address !== undefined) {
            updates.push('address = ?');
            values.push(address);
        }
        if (emergencyContactName !== undefined) {
            updates.push('emergency_contact_name = ?');
            values.push(emergencyContactName);
        }
        if (emergencyContactPhone !== undefined) {
            updates.push('emergency_contact_phone = ?');
            values.push(emergencyContactPhone);
        }

        if (updates.length === 0) {
            return sendError(res, 'No fields to update', 400);
        }

        values.push(studentId);

        // Execute update
        await query(
            `UPDATE students SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        // Get updated profile
        const updatedProfile = await query(
            `SELECT id, student_id, email, first_name, last_name, date_of_birth,
                    gender, phone, address, course, department, year_of_study,
                    emergency_contact_name, emergency_contact_phone, profile_image, updated_at
             FROM students WHERE id = ?`,
            [studentId]
        );

        return sendSuccess(res, 'Profile updated successfully', updatedProfile[0]);

    } catch (error) {
        console.error('Update Profile Error:', error);
        return sendError(res, 'Failed to update profile', 500);
    }
};

/**
 * Change student password
 * PUT /api/students/change-password
 */
const changePassword = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        // Get current password hash
        const students = await query(
            'SELECT password FROM students WHERE id = ?',
            [studentId]
        );

        if (students.length === 0) {
            return sendError(res, 'Student not found', 404);
        }

        // Verify current password
        const isCurrentValid = await comparePassword(currentPassword, students[0].password);

        if (!isCurrentValid) {
            return sendError(res, 'Current password is incorrect', 400);
        }

        // Hash new password
        const hashedNewPassword = await hashPassword(newPassword);

        // Update password
        await query(
            'UPDATE students SET password = ? WHERE id = ?',
            [hashedNewPassword, studentId]
        );

        return sendSuccess(res, 'Password changed successfully');

    } catch (error) {
        console.error('Change Password Error:', error);
        return sendError(res, 'Failed to change password', 500);
    }
};

// =====================================================
// Room Application Controllers
// =====================================================

/**
 * Submit room application
 * POST /api/students/applications
 */
const submitApplication = async (req, res) => {
    try {
        const studentId = req.user.id;
        const {
            preferredBlockId,
            preferredRoomType,
            preferredStartDate,
            durationMonths,
            specialRequirements
        } = req.body;

        // Check if student already has an active application
        const existingApplication = await query(
            `SELECT id FROM room_applications 
             WHERE student_id = ? AND status IN ('pending', 'approved')`,
            [studentId]
        );

        if (existingApplication.length > 0) {
            return sendError(res, 'You already have an active application', 409);
        }

        // Check if student already has an active room allocation
        const existingAllocation = await query(
            `SELECT id FROM room_allocations 
             WHERE student_id = ? AND allocation_status = 'active'`,
            [studentId]
        );

        if (existingAllocation.length > 0) {
            return sendError(res, 'You already have an active room allocation', 409);
        }

        // Validate preferred block if provided
        if (preferredBlockId) {
            const block = await query(
                'SELECT id FROM hostel_blocks WHERE id = ? AND is_active = TRUE',
                [preferredBlockId]
            );

            if (block.length === 0) {
                return sendError(res, 'Invalid or inactive block selected', 400);
            }
        }

        // Create application
        const result = await query(
            `INSERT INTO room_applications (
                student_id, preferred_block_id, preferred_room_type, 
                preferred_start_date, duration_months, special_requirements
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                studentId,
                preferredBlockId || null,
                preferredRoomType || 'any',
                preferredStartDate,
                durationMonths || 12,
                specialRequirements || null
            ]
        );

        // Get created application
        const application = await query(
            `SELECT ra.*, hb.block_name, hb.block_code
             FROM room_applications ra
             LEFT JOIN hostel_blocks hb ON ra.preferred_block_id = hb.id
             WHERE ra.id = ?`,
            [result.insertId]
        );

        return sendSuccess(res, 'Application submitted successfully', application[0], 201);

    } catch (error) {
        console.error('Submit Application Error:', error);
        return sendError(res, 'Failed to submit application', 500);
    }
};

/**
 * Get student's applications
 * GET /api/students/applications
 */
const getMyApplications = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { page, limit, offset } = getPaginationParams(req);

        // Get total count
        const countResult = await query(
            'SELECT COUNT(*) as total FROM room_applications WHERE student_id = ?',
            [studentId]
        );
        const total = countResult[0].total;

        // Get applications
        const applications = await query(
            `SELECT ra.*, hb.block_name, hb.block_code,
                    CASE 
                        WHEN ra.status = 'approved' THEN r.room_number
                        ELSE NULL
                    END as allocated_room_number
             FROM room_applications ra
             LEFT JOIN hostel_blocks hb ON ra.preferred_block_id = hb.id
             LEFT JOIN room_allocations ral ON ra.id = ral.application_id
             LEFT JOIN rooms r ON ral.room_id = r.id
             WHERE ra.student_id = ?
             ORDER BY ra.application_date DESC
             LIMIT ? OFFSET ?`,
            [studentId, limit, offset]
        );

        return sendSuccess(res, 'Applications retrieved successfully', {
            applications,
            pagination: createPagination(page, limit, total)
        });

    } catch (error) {
        console.error('Get Applications Error:', error);
        return sendError(res, 'Failed to retrieve applications', 500);
    }
};

/**
 * Get application by ID
 * GET /api/students/applications/:id
 */
const getApplicationById = async (req, res) => {
    try {
        const studentId = req.user.id;
        const applicationId = req.params.id;

        const applications = await query(
            `SELECT ra.*, hb.block_name, hb.block_code,
                    a.username as processed_by_username
             FROM room_applications ra
             LEFT JOIN hostel_blocks hb ON ra.preferred_block_id = hb.id
             LEFT JOIN admin a ON ra.processed_by = a.id
             WHERE ra.id = ? AND ra.student_id = ?`,
            [applicationId, studentId]
        );

        if (applications.length === 0) {
            return sendError(res, 'Application not found', 404);
        }

        return sendSuccess(res, 'Application retrieved successfully', applications[0]);

    } catch (error) {
        console.error('Get Application Error:', error);
        return sendError(res, 'Failed to retrieve application', 500);
    }
};

/**
 * Cancel application
 * PUT /api/students/applications/:id/cancel
 */
const cancelApplication = async (req, res) => {
    try {
        const studentId = req.user.id;
        const applicationId = req.params.id;

        // Check if application exists and belongs to student
        const application = await query(
            'SELECT status FROM room_applications WHERE id = ? AND student_id = ?',
            [applicationId, studentId]
        );

        if (application.length === 0) {
            return sendError(res, 'Application not found', 404);
        }

        if (application[0].status !== 'pending') {
            return sendError(res, 'Only pending applications can be cancelled', 400);
        }

        // Update application status
        await query(
            `UPDATE room_applications 
             SET status = 'cancelled', updated_at = NOW() 
             WHERE id = ?`,
            [applicationId]
        );

        return sendSuccess(res, 'Application cancelled successfully');

    } catch (error) {
        console.error('Cancel Application Error:', error);
        return sendError(res, 'Failed to cancel application', 500);
    }
};

// =====================================================
// Room Allocation Controllers
// =====================================================

/**
 * Get student's room allocation
 * GET /api/students/allocation
 */
const getMyAllocation = async (req, res) => {
    try {
        const studentId = req.user.id;

        const allocations = await query(
            `SELECT ra.*, r.room_number, r.room_type, r.floor_number, r.facilities,
                    hb.block_name, hb.block_code, hb.warden_name, hb.warden_contact
             FROM room_allocations ra
             JOIN rooms r ON ra.room_id = r.id
             JOIN hostel_blocks hb ON r.block_id = hb.id
             WHERE ra.student_id = ? AND ra.allocation_status = 'active'`,
            [studentId]
        );

        if (allocations.length === 0) {
            return sendSuccess(res, 'No active allocation found', null);
        }

        // Get roommates if any
        const roommates = await query(
            `SELECT s.student_id, CONCAT(s.first_name, ' ', s.last_name) as name,
                    s.course, s.year_of_study, s.phone
             FROM room_allocations ra
             JOIN students s ON ra.student_id = s.id
             WHERE ra.room_id = ? AND ra.allocation_status = 'active' AND ra.student_id != ?`,
            [allocations[0].room_id, studentId]
        );

        return sendSuccess(res, 'Allocation retrieved successfully', {
            allocation: allocations[0],
            roommates
        });

    } catch (error) {
        console.error('Get Allocation Error:', error);
        return sendError(res, 'Failed to retrieve allocation', 500);
    }
};

/**
 * Get room allocation history
 * GET /api/students/allocation-history
 */
const getAllocationHistory = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { page, limit, offset } = getPaginationParams(req);

        // Get total count
        const countResult = await query(
            'SELECT COUNT(*) as total FROM room_allocations WHERE student_id = ?',
            [studentId]
        );
        const total = countResult[0].total;

        // Get allocation history
        const allocations = await query(
            `SELECT ra.*, r.room_number, r.room_type, r.facilities,
                    hb.block_name, hb.block_code
             FROM room_allocations ra
             JOIN rooms r ON ra.room_id = r.id
             JOIN hostel_blocks hb ON r.block_id = hb.id
             WHERE ra.student_id = ?
             ORDER BY ra.allocation_date DESC
             LIMIT ? OFFSET ?`,
            [studentId, limit, offset]
        );

        return sendSuccess(res, 'Allocation history retrieved successfully', {
            allocations,
            pagination: createPagination(page, limit, total)
        });

    } catch (error) {
        console.error('Get Allocation History Error:', error);
        return sendError(res, 'Failed to retrieve allocation history', 500);
    }
};

// =====================================================
// Dashboard and Info Controllers
// =====================================================

/**
 * Get student dashboard data
 * GET /api/students/dashboard
 */
const getDashboard = async (req, res) => {
    try {
        const studentId = req.user.id;

        // Get profile summary
        const profile = await query(
            `SELECT id, student_id, email, first_name, last_name, 
                    course, year_of_study, profile_image
             FROM students WHERE id = ?`,
            [studentId]
        );

        // Get active application count
        const applicationCount = await query(
            `SELECT COUNT(*) as count FROM room_applications 
             WHERE student_id = ? AND status IN ('pending', 'approved')`,
            [studentId]
        );

        // Get active allocation
        const allocation = await query(
            `SELECT ra.*, r.room_number, hb.block_name, hb.block_code
             FROM room_allocations ra
             JOIN rooms r ON ra.room_id = r.id
             JOIN hostel_blocks hb ON r.block_id = hb.id
             WHERE ra.student_id = ? AND ra.allocation_status = 'active'`,
            [studentId]
        );

        // Get payment summary
        const paymentSummary = await query(
            `SELECT 
                COUNT(*) as total_payments,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_payments,
                SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_paid
             FROM payments WHERE student_id = ?`,
            [studentId]
        );

        return sendSuccess(res, 'Dashboard data retrieved successfully', {
            profile: profile[0],
            activeApplications: applicationCount[0].count,
            activeAllocation: allocation[0] || null,
            paymentSummary: paymentSummary[0]
        });

    } catch (error) {
        console.error('Get Dashboard Error:', error);
        return sendError(res, 'Failed to retrieve dashboard data', 500);
    }
};

/**
 * Get available rooms for students
 * GET /api/students/available-rooms
 */
const getAvailableRooms = async (req, res) => {
    try {
        const { blockId, roomType } = req.query;

        let sql = `
            SELECT r.*, hb.block_name, hb.block_code, hb.gender_type
            FROM rooms r
            JOIN hostel_blocks hb ON r.block_id = hb.id
            WHERE r.is_active = TRUE 
              AND r.room_status = 'available'
              AND r.available_beds > 0
        `;
        
        const params = [];

        if (blockId) {
            sql += ' AND r.block_id = ?';
            params.push(blockId);
        }

        if (roomType) {
            sql += ' AND r.room_type = ?';
            params.push(roomType);
        }

        sql += ' ORDER BY hb.block_name, r.room_number';

        const rooms = await query(sql, params);

        return sendSuccess(res, 'Available rooms retrieved successfully', rooms);

    } catch (error) {
        console.error('Get Available Rooms Error:', error);
        return sendError(res, 'Failed to retrieve available rooms', 500);
    }
};

/**
 * Get hostel blocks list
 * GET /api/students/blocks
 */
const getBlocks = async (req, res) => {
    try {
        const blocks = await query(
            `SELECT id, block_name, block_code, gender_type, description, total_floors
             FROM hostel_blocks 
             WHERE is_active = TRUE
             ORDER BY block_name`
        );

        return sendSuccess(res, 'Hostel blocks retrieved successfully', blocks);

    } catch (error) {
        console.error('Get Blocks Error:', error);
        return sendError(res, 'Failed to retrieve hostel blocks', 500);
    }
};

// =====================================================
// Export all controllers
// =====================================================

module.exports = {
    // Authentication
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    
    // Applications
    submitApplication,
    getMyApplications,
    getApplicationById,
    cancelApplication,
    
    // Allocations
    getMyAllocation,
    getAllocationHistory,
    
    // Dashboard
    getDashboard,
    getAvailableRooms,
    getBlocks
};