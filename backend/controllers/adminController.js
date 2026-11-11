/**
 * Admin Controller Module
 * Handles all admin-related operations including dashboard, student management, room management, and allocations
 */

const { query, transaction } = require('../config/database');
const { 
    hashPassword, 
    comparePassword,
    generateTokens, 
    sendSuccess, 
    sendError,
    getPaginationParams,
    createPagination,
    omit
} = require('../utils/helpers');

// =====================================================
// Authentication Controllers
// =====================================================

/**
 * Admin login
 * POST /api/admin/login
 */
const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        // Find admin by username
        const admins = await query(
            `SELECT id, username, email, password, full_name, phone, role, is_active, last_login
             FROM admin WHERE username = ?`,
            [username]
        );

        if (admins.length === 0) {
            return sendError(res, 'Invalid username or password', 401);
        }

        const admin = admins[0];

        // Check if account is active
        if (!admin.is_active) {
            return sendError(res, 'Your account has been deactivated', 403);
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, admin.password);

        if (!isPasswordValid) {
            return sendError(res, 'Invalid username or password', 401);
        }

        // Update last login time
        await query(
            'UPDATE admin SET last_login = NOW() WHERE id = ?',
            [admin.id]
        );

        // Generate tokens
        const tokens = generateTokens({
            id: admin.id,
            userType: 'admin',
            email: admin.email,
            role: admin.role
        });

        // Remove password from response
        const adminData = omit(admin, ['password']);

        return sendSuccess(res, 'Login successful', {
            admin: adminData,
            ...tokens
        });

    } catch (error) {
        return next(error);
    }
};

/**
 * Get admin profile
 * GET /api/admin/profile
 */
const getProfile = async (req, res, next) => {
    try {
        const adminId = req.user.id;

        const admins = await query(
            `SELECT id, username, email, full_name, phone, role, is_active, created_at, last_login
             FROM admin WHERE id = ?`,
            [adminId]
        );

        if (admins.length === 0) {
            return sendError(res, 'Admin not found', 404);
        }

        return sendSuccess(res, 'Profile retrieved successfully', admins[0]);

    } catch (error) {
        return next(error);
    }
};

/**
 * Create new admin (super admin only)
 * POST /api/admin/create
 */
const createAdmin = async (req, res, next) => {
    try {
        const { username, password, email, fullName, phone, role } = req.body;

        // Check if username or email already exists
        const existing = await query(
            'SELECT id FROM admin WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing.length > 0) {
            return sendError(res, 'Username or email already exists', 409);
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Insert new admin
        const result = await query(
            `INSERT INTO admin (username, password, email, full_name, phone, role) 
             VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
            [username, hashedPassword, email, fullName, phone || null, role || 'admin']
        );

        const newAdmin = await query(
            `SELECT id, username, email, full_name, phone, role, is_active, created_at 
             FROM admin WHERE id = ?`,
            [result[0].id]
        );

        return sendSuccess(res, 'Admin created successfully', newAdmin[0], 201);

    } catch (error) {
        return next(error);
    }
};

// =====================================================
// Dashboard Controllers
// =====================================================

/**
 * Get admin dashboard statistics
 * GET /api/admin/dashboard
 */
const getDashboard = async (req, res, next) => {
    try {
        // Get counts
        const studentCount = await query(
            'SELECT COUNT(*) as total FROM students WHERE is_active = TRUE'
        );

        const roomCount = await query(
            'SELECT COUNT(*) as total FROM rooms WHERE is_active = TRUE'
        );

        const allocationCount = await query(
            `SELECT COUNT(*) as total FROM room_allocations WHERE allocation_status = 'active'`
        );

        const pendingApplications = await query(
            `SELECT COUNT(*) as total FROM room_applications WHERE status = 'pending'`
        );

        // Get room availability summary
        const roomSummary = await query(
            `SELECT 
                SUM(capacity) as total_capacity,
                SUM(occupied_beds) as total_occupied,
                SUM(available_beds) as total_available,
                COUNT(CASE WHEN room_status = 'available' THEN 1 END) as available_rooms,
                COUNT(CASE WHEN room_status = 'full' THEN 1 END) as full_rooms,
                COUNT(CASE WHEN room_status = 'maintenance' THEN 1 END) as maintenance_rooms
             FROM rooms WHERE is_active = TRUE`
        );

        // Get recent applications
        const recentApplications = await query(
            `SELECT ra.*, s.student_id, CONCAT(s.first_name, ' ', s.last_name) as student_name
             FROM room_applications ra
             JOIN students s ON ra.student_id = s.id
             ORDER BY ra.application_date DESC
             LIMIT 5`
        );

        // Get recent allocations
        const recentAllocations = await query(
            `SELECT ra.*, s.student_id, CONCAT(s.first_name, ' ', s.last_name) as student_name,
                    r.room_number, hb.block_name
             FROM room_allocations ra
             JOIN students s ON ra.student_id = s.id
             JOIN rooms r ON ra.room_id = r.id
             JOIN hostel_blocks hb ON r.block_id = hb.id
             ORDER BY ra.allocation_date DESC
             LIMIT 5`
        );

        // Get occupancy by block
        const occupancyByBlock = await query(
            `SELECT 
                hb.block_name,
                COUNT(r.id) as total_rooms,
                SUM(r.capacity) as total_capacity,
                SUM(r.occupied_beds) as total_occupied,
                COALESCE(ROUND(SUM(r.occupied_beds)::numeric / NULLIF(SUM(r.capacity), 0) * 100, 2), 0) as occupancy_rate
             FROM hostel_blocks hb
             LEFT JOIN rooms r ON hb.id = r.block_id AND r.is_active = TRUE
             WHERE hb.is_active = TRUE
             GROUP BY hb.id, hb.block_name`
        );

        const [extra] = await query(
            `SELECT
                (SELECT COUNT(*) FROM complaints WHERE status IN ('open', 'in_progress')) AS open_complaints,
                (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed'
                    AND date_trunc('month', payment_date) = date_trunc('month', NOW())) AS collected_this_month,
                (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'pending') AS pending_dues`
        );

        return sendSuccess(res, 'Dashboard data retrieved successfully', {
            statistics: {
                totalStudents: studentCount[0].total,
                totalRooms: roomCount[0].total,
                activeAllocations: allocationCount[0].total,
                pendingApplications: pendingApplications[0].total,
                openComplaints: extra.open_complaints,
                collectedThisMonth: extra.collected_this_month,
                pendingDues: extra.pending_dues
            },
            roomSummary: roomSummary[0],
            recentApplications,
            recentAllocations,
            occupancyByBlock
        });

    } catch (error) {
        return next(error);
    }
};

// =====================================================
// Student Management Controllers
// =====================================================

/**
 * Get all students
 * GET /api/admin/students
 */
const getAllStudents = async (req, res, next) => {
    try {
        const { page, limit, offset } = getPaginationParams(req);
        const { search, course, year, gender } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (search) {
            whereClause += ` AND (s.student_id ILIKE ? OR s.first_name ILIKE ? OR s.last_name ILIKE ? OR s.email ILIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (course) {
            whereClause += ' AND s.course = ?';
            params.push(course);
        }

        if (year) {
            whereClause += ' AND s.year_of_study = ?';
            params.push(year);
        }

        if (gender) {
            whereClause += ' AND s.gender = ?';
            params.push(gender);
        }

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM students s ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get students with allocation info
        const students = await query(
            `SELECT s.*, 
                    CASE WHEN ra.id IS NOT NULL THEN TRUE ELSE FALSE END as has_allocation,
                    r.room_number, hb.block_name
             FROM students s
             LEFT JOIN room_allocations ra ON s.id = ra.student_id AND ra.allocation_status = 'active'
             LEFT JOIN rooms r ON ra.room_id = r.id
             LEFT JOIN hostel_blocks hb ON r.block_id = hb.id
             ${whereClause}
             ORDER BY s.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // Remove passwords from response
        const sanitizedStudents = students.map(s => omit(s, ['password']));

        return sendSuccess(res, 'Students retrieved successfully', {
            students: sanitizedStudents,
            pagination: createPagination(page, limit, total)
        });

    } catch (error) {
        return next(error);
    }
};

/**
 * Get student by ID
 * GET /api/admin/students/:id
 */
const getStudentById = async (req, res, next) => {
    try {
        const studentId = req.params.id;

        const students = await query(
            `SELECT s.*, 
                    ra.id as allocation_id, ra.allocation_date, ra.start_date, ra.end_date,
                    ra.rent_amount, ra.payment_status, ra.allocation_status,
                    r.room_number, r.room_type, r.floor_number,
                    hb.block_name, hb.block_code
             FROM students s
             LEFT JOIN room_allocations ra ON s.id = ra.student_id AND ra.allocation_status = 'active'
             LEFT JOIN rooms r ON ra.room_id = r.id
             LEFT JOIN hostel_blocks hb ON r.block_id = hb.id
             WHERE s.id = ?`,
            [studentId]
        );

        if (students.length === 0) {
            return sendError(res, 'Student not found', 404);
        }

        // Get application history
        const applications = await query(
            `SELECT ra.*, hb.block_name
             FROM room_applications ra
             LEFT JOIN hostel_blocks hb ON ra.preferred_block_id = hb.id
             WHERE ra.student_id = ?
             ORDER BY ra.application_date DESC`,
            [studentId]
        );

        // Get allocation history
        const allocations = await query(
            `SELECT ra.*, r.room_number, hb.block_name
             FROM room_allocations ra
             JOIN rooms r ON ra.room_id = r.id
             JOIN hostel_blocks hb ON r.block_id = hb.id
             WHERE ra.student_id = ?
             ORDER BY ra.allocation_date DESC`,
            [studentId]
        );

        const studentData = omit(students[0], ['password']);

        return sendSuccess(res, 'Student retrieved successfully', {
            student: studentData,
            applications,
            allocations
        });

    } catch (error) {
        return next(error);
    }
};

/**
 * Update student
 * PUT /api/admin/students/:id
 */
const updateStudent = async (req, res, next) => {
    try {
        const studentId = req.params.id;
        const updates = req.body;

        // Check if student exists
        const existing = await query(
            'SELECT id FROM students WHERE id = ?',
            [studentId]
        );

        if (existing.length === 0) {
            return sendError(res, 'Student not found', 404);
        }

        // Build update query
        const allowedFields = ['firstName', 'lastName', 'phone', 'address', 'course', 
                               'department', 'yearOfStudy', 'emergencyContactName', 
                               'emergencyContactPhone', 'isActive'];
        
        const setClause = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            const dbField = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            if (allowedFields.includes(key)) {
                setClause.push(`${dbField} = ?`);
                values.push(value);
            }
        }

        if (setClause.length === 0) {
            return sendError(res, 'No valid fields to update', 400);
        }

        values.push(studentId);

        await query(
            `UPDATE students SET ${setClause.join(', ')} WHERE id = ?`,
            values
        );

        return sendSuccess(res, 'Student updated successfully');

    } catch (error) {
        return next(error);
    }
};

/**
 * Delete/Deactivate student
 * DELETE /api/admin/students/:id
 */
const deleteStudent = async (req, res, next) => {
    try {
        const studentId = req.params.id;

        // Check if student has active allocation
        const activeAllocation = await query(
            `SELECT id FROM room_allocations 
             WHERE student_id = ? AND allocation_status = 'active'`,
            [studentId]
        );

        if (activeAllocation.length > 0) {
            return sendError(res, 'Cannot delete student with active room allocation', 400);
        }

        // Soft delete - deactivate student
        await query(
            'UPDATE students SET is_active = FALSE WHERE id = ?',
            [studentId]
        );

        return sendSuccess(res, 'Student deactivated successfully');

    } catch (error) {
        return next(error);
    }
};

// =====================================================
// Hostel Block Controllers
// =====================================================

/**
 * Get all hostel blocks
 * GET /api/admin/blocks
 */
const getAllBlocks = async (req, res, next) => {
    try {
        const blocks = await query(
            `SELECT hb.*, 
                    COUNT(r.id) as total_rooms,
                    SUM(r.capacity) as total_capacity,
                    SUM(r.occupied_beds) as total_occupied
             FROM hostel_blocks hb
             LEFT JOIN rooms r ON hb.id = r.block_id AND r.is_active = TRUE
             GROUP BY hb.id
             ORDER BY hb.block_name`
        );

        return sendSuccess(res, 'Hostel blocks retrieved successfully', blocks);

    } catch (error) {
        return next(error);
    }
};

/**
 * Create hostel block
 * POST /api/admin/blocks
 */
const createBlock = async (req, res, next) => {
    try {
        const { blockName, blockCode, genderType, description, totalFloors, wardenName, wardenContact } = req.body;

        // Check if block code already exists
        const existing = await query(
            'SELECT id FROM hostel_blocks WHERE block_code = ? OR block_name = ?',
            [blockCode, blockName]
        );

        if (existing.length > 0) {
            return sendError(res, 'Block code or name already exists', 409);
        }

        const result = await query(
            `INSERT INTO hostel_blocks (block_name, block_code, gender_type, description, 
                                       total_floors, warden_name, warden_contact) 
             VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
            [blockName, blockCode, genderType, description || null, totalFloors || 1, wardenName || null, wardenContact || null]
        );

        const newBlock = await query(
            'SELECT * FROM hostel_blocks WHERE id = ?',
            [result[0].id]
        );

        return sendSuccess(res, 'Hostel block created successfully', newBlock[0], 201);

    } catch (error) {
        return next(error);
    }
};

/**
 * Update hostel block
 * PUT /api/admin/blocks/:id
 */
const updateBlock = async (req, res, next) => {
    try {
        const blockId = req.params.id;
        const { blockName, genderType, description, totalFloors, wardenName, wardenContact, isActive } = req.body;

        // Partial update: omitted fields keep their current value.
        const updated = await query(
            `UPDATE hostel_blocks
             SET block_name = COALESCE(?, block_name), gender_type = COALESCE(?, gender_type),
                 description = COALESCE(?, description), total_floors = COALESCE(?, total_floors),
                 warden_name = COALESCE(?, warden_name), warden_contact = COALESCE(?, warden_contact),
                 is_active = COALESCE(?, is_active)
             WHERE id = ? RETURNING *`,
            [blockName ?? null, genderType ?? null, description ?? null, totalFloors ?? null,
             wardenName ?? null, wardenContact ?? null, isActive ?? null, blockId]
        );

        if (updated.length === 0) {
            return sendError(res, 'Hostel block not found', 404);
        }

        return sendSuccess(res, 'Hostel block updated successfully', updated[0]);

    } catch (error) {
        return next(error);
    }
};

/**
 * Delete hostel block
 * DELETE /api/admin/blocks/:id
 */
const deleteBlock = async (req, res, next) => {
    try {
        const blockId = req.params.id;

        // Check if block has rooms
        const rooms = await query(
            'SELECT id FROM rooms WHERE block_id = ? AND is_active = TRUE',
            [blockId]
        );

        if (rooms.length > 0) {
            return sendError(res, 'Cannot delete block with active rooms', 400);
        }

        await query('DELETE FROM hostel_blocks WHERE id = ?', [blockId]);

        return sendSuccess(res, 'Hostel block deleted successfully');

    } catch (error) {
        return next(error);
    }
};

// =====================================================
// Room Management Controllers
// =====================================================

/**
 * Get all rooms
 * GET /api/admin/rooms
 */
const getAllRooms = async (req, res, next) => {
    try {
        const { page, limit, offset } = getPaginationParams(req);
        const { blockId, status, roomType } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (blockId) {
            whereClause += ' AND r.block_id = ?';
            params.push(blockId);
        }

        if (status) {
            whereClause += ' AND r.room_status = ?';
            params.push(status);
        }

        if (roomType) {
            whereClause += ' AND r.room_type = ?';
            params.push(roomType);
        }

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM rooms r ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get rooms with block info
        const rooms = await query(
            `SELECT r.*, hb.block_name, hb.block_code, hb.gender_type
             FROM rooms r
             JOIN hostel_blocks hb ON r.block_id = hb.id
             ${whereClause}
             ORDER BY hb.block_name, r.room_number
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return sendSuccess(res, 'Rooms retrieved successfully', {
            rooms,
            pagination: createPagination(page, limit, total)
        });

    } catch (error) {
        return next(error);
    }
};

/**
 * Get room by ID with occupants
 * GET /api/admin/rooms/:id
 */
const getRoomById = async (req, res, next) => {
    try {
        const roomId = req.params.id;

        const rooms = await query(
            `SELECT r.*, hb.block_name, hb.block_code, hb.gender_type, hb.warden_name
             FROM rooms r
             JOIN hostel_blocks hb ON r.block_id = hb.id
             WHERE r.id = ?`,
            [roomId]
        );

        if (rooms.length === 0) {
            return sendError(res, 'Room not found', 404);
        }

        // Get current occupants
        const occupants = await query(
            `SELECT s.id, s.student_id, CONCAT(s.first_name, ' ', s.last_name) as name,
                    s.course, s.year_of_study, s.phone, ra.bed_number, ra.allocation_date
             FROM room_allocations ra
             JOIN students s ON ra.student_id = s.id
             WHERE ra.room_id = ? AND ra.allocation_status = 'active'`,
            [roomId]
        );

        return sendSuccess(res, 'Room retrieved successfully', {
            room: rooms[0],
            occupants
        });

    } catch (error) {
        return next(error);
    }
};

/**
 * Create room
 * POST /api/admin/rooms
 */
const createRoom = async (req, res, next) => {
    try {
        const { roomNumber, blockId, floorNumber, roomType, capacity, facilities, monthlyRent } = req.body;

        // Check if room already exists in block
        const existing = await query(
            'SELECT id FROM rooms WHERE room_number = ? AND block_id = ?',
            [roomNumber, blockId]
        );

        if (existing.length > 0) {
            return sendError(res, 'Room already exists in this block', 409);
        }

        const result = await query(
            `INSERT INTO rooms (room_number, block_id, floor_number, room_type, 
                               capacity, facilities, monthly_rent) 
             VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
            [roomNumber, blockId, floorNumber || 1, roomType || 'double', 
             capacity || 2, facilities || null, monthlyRent || 0]
        );

        const newRoom = await query(
            `SELECT r.*, hb.block_name, hb.block_code
             FROM rooms r
             JOIN hostel_blocks hb ON r.block_id = hb.id
             WHERE r.id = ?`,
            [result[0].id]
        );

        return sendSuccess(res, 'Room created successfully', newRoom[0], 201);

    } catch (error) {
        return next(error);
    }
};

/**
 * Update room
 * PUT /api/admin/rooms/:id
 */
const updateRoom = async (req, res, next) => {
    try {
        const roomId = req.params.id;
        const { roomNumber, floorNumber, roomType, capacity, facilities, monthlyRent, roomStatus, isActive } = req.body;

        // Partial update; the rooms_beds_in_range CHECK rejects shrinking below occupied beds.
        const updated = await query(
            `UPDATE rooms
             SET room_number = COALESCE(?, room_number), floor_number = COALESCE(?, floor_number),
                 room_type = COALESCE(?, room_type), capacity = COALESCE(?, capacity),
                 facilities = COALESCE(?, facilities), monthly_rent = COALESCE(?, monthly_rent),
                 room_status = COALESCE(?, room_status), is_active = COALESCE(?, is_active)
             WHERE id = ? RETURNING *`,
            [roomNumber ?? null, floorNumber ?? null, roomType ?? null, capacity ?? null, facilities ?? null,
             monthlyRent ?? null, roomStatus ?? null, isActive ?? null, roomId]
        );

        if (updated.length === 0) {
            return sendError(res, 'Room not found', 404);
        }

        return sendSuccess(res, 'Room updated successfully', updated[0]);

    } catch (error) {
        return next(error);
    }
};

/**
 * Delete room
 * DELETE /api/admin/rooms/:id
 */
const deleteRoom = async (req, res, next) => {
    try {
        const roomId = req.params.id;

        // Check if room has active allocations
        const allocations = await query(
            `SELECT id FROM room_allocations 
             WHERE room_id = ? AND allocation_status = 'active'`,
            [roomId]
        );

        if (allocations.length > 0) {
            return sendError(res, 'Cannot delete room with active allocations', 400);
        }

        await query('DELETE FROM rooms WHERE id = ?', [roomId]);

        return sendSuccess(res, 'Room deleted successfully');

    } catch (error) {
        return next(error);
    }
};

// =====================================================
// Application Management Controllers
// =====================================================

/**
 * Get all applications
 * GET /api/admin/applications
 */
const getAllApplications = async (req, res, next) => {
    try {
        const { page, limit, offset } = getPaginationParams(req);
        const { status, studentId } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (status) {
            whereClause += ' AND ra.status = ?';
            params.push(status);
        }

        if (studentId) {
            whereClause += ' AND ra.student_id = ?';
            params.push(studentId);
        }

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM room_applications ra ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get applications
        const applications = await query(
            `SELECT ra.*, 
                    s.student_id, CONCAT(s.first_name, ' ', s.last_name) as student_name,
                    s.email, s.course, s.year_of_study, s.gender,
                    hb.block_name as preferred_block,
                    a.username as processed_by_name
             FROM room_applications ra
             JOIN students s ON ra.student_id = s.id
             LEFT JOIN hostel_blocks hb ON ra.preferred_block_id = hb.id
             LEFT JOIN admin a ON ra.processed_by = a.id
             ${whereClause}
             ORDER BY 
                CASE ra.status 
                    WHEN 'pending' THEN 1 
                    WHEN 'approved' THEN 2 
                    WHEN 'waitlisted' THEN 3 
                    WHEN 'rejected' THEN 4 
                    ELSE 5 
                END,
                ra.application_date DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return sendSuccess(res, 'Applications retrieved successfully', {
            applications,
            pagination: createPagination(page, limit, total)
        });

    } catch (error) {
        return next(error);
    }
};

/**
 * Process application (approve/reject)
 * PUT /api/admin/applications/:id/process
 */
const processApplication = async (req, res, next) => {
    try {
        const applicationId = req.params.id;
        const adminId = req.user.id;
        const { status, adminRemarks } = req.body;

        // Get application details
        const application = await query(
            `SELECT ra.*, s.gender
             FROM room_applications ra
             JOIN students s ON ra.student_id = s.id
             WHERE ra.id = ?`,
            [applicationId]
        );

        if (application.length === 0) {
            return sendError(res, 'Application not found', 404);
        }

        // Waitlisted applications stay open so they can be approved when a bed frees up.
        if (!['pending', 'waitlisted'].includes(application[0].status)) {
            return sendError(res, 'Application has already been processed', 400);
        }

        // Update application
        await query(
            `UPDATE room_applications 
             SET status = ?, admin_remarks = ?, processed_by = ?, processed_at = NOW()
             WHERE id = ?`,
            [status, adminRemarks || null, adminId, applicationId]
        );

        return sendSuccess(res, `Application ${status} successfully`);

    } catch (error) {
        return next(error);
    }
};

// =====================================================
// Room Allocation Controllers
// =====================================================

/**
 * Get all allocations
 * GET /api/admin/allocations
 */
const getAllAllocations = async (req, res, next) => {
    try {
        const { page, limit, offset } = getPaginationParams(req);
        const { status, roomId, studentId } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (status) {
            whereClause += ' AND ra.allocation_status = ?';
            params.push(status);
        }

        if (roomId) {
            whereClause += ' AND ra.room_id = ?';
            params.push(roomId);
        }

        if (studentId) {
            whereClause += ' AND ra.student_id = ?';
            params.push(studentId);
        }

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM room_allocations ra ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get allocations
        const allocations = await query(
            `SELECT ra.*, 
                    s.student_id, CONCAT(s.first_name, ' ', s.last_name) as student_name,
                    s.email, s.phone, s.course,
                    r.room_number, r.room_type, r.floor_number,
                    hb.block_name, hb.block_code,
                    a.username as allocated_by_name
             FROM room_allocations ra
             JOIN students s ON ra.student_id = s.id
             JOIN rooms r ON ra.room_id = r.id
             JOIN hostel_blocks hb ON r.block_id = hb.id
             JOIN admin a ON ra.allocated_by = a.id
             ${whereClause}
             ORDER BY ra.allocation_date DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return sendSuccess(res, 'Allocations retrieved successfully', {
            allocations,
            pagination: createPagination(page, limit, total)
        });

    } catch (error) {
        return next(error);
    }
};

/**
 * Create room allocation
 * POST /api/admin/allocations
 */
const createAllocation = async (req, res, next) => {
    try {
        const adminId = req.user.id;
        const { studentId, roomId, applicationId, bedNumber, startDate, endDate, rentAmount, securityDeposit } = req.body;

        const student = await query('SELECT gender, is_active FROM students WHERE id = ?', [studentId]);
        if (student.length === 0 || !student[0].is_active) {
            return sendError(res, 'Student not found or inactive', 404);
        }

        // Check if student already has active allocation
        const existingAllocation = await query(
            `SELECT id FROM room_allocations
             WHERE student_id = ? AND allocation_status = 'active'`,
            [studentId]
        );

        if (existingAllocation.length > 0) {
            return sendError(res, 'Student already has an active allocation', 409);
        }

        // Check room availability
        const room = await query(
            `SELECT r.*, hb.gender_type FROM rooms r JOIN hostel_blocks hb ON r.block_id = hb.id
             WHERE r.id = ? AND r.is_active = TRUE`,
            [roomId]
        );

        if (room.length === 0) {
            return sendError(res, 'Room not found or inactive', 404);
        }

        if (['maintenance', 'reserved'].includes(room[0].room_status)) {
            return sendError(res, `Room is under ${room[0].room_status}`, 400);
        }

        if (room[0].available_beds <= 0) {
            return sendError(res, 'Room is full', 400);
        }

        if (room[0].gender_type !== 'mixed' && room[0].gender_type !== student[0].gender) {
            return sendError(res, `This block is reserved for ${room[0].gender_type} students`, 400);
        }

        // Allocation + application approval succeed or fail together.
        const result = await transaction(async (db) => {
            const inserted = await db.query(
                `INSERT INTO room_allocations (
                    student_id, room_id, application_id, bed_number, allocation_date,
                    start_date, end_date, rent_amount, security_deposit, allocated_by
                ) VALUES (?, ?, ?, ?, CURRENT_DATE, ?, ?, ?, ?, ?) RETURNING id`,
                [studentId, roomId, applicationId || null, bedNumber || room[0].occupied_beds + 1,
                 startDate, endDate || null, rentAmount ?? room[0].monthly_rent, securityDeposit || 0, adminId]
            );
            if (applicationId) {
                await db.query(
                    `UPDATE room_applications
                     SET status = 'approved', processed_by = ?, processed_at = NOW(),
                         admin_remarks = COALESCE(admin_remarks, 'Room allotted')
                     WHERE id = ? AND student_id = ?`,
                    [adminId, applicationId, studentId]
                );
            }
            return inserted;
        });

        const newAllocation = await query(
            `SELECT ra.*, s.student_id, CONCAT(s.first_name, ' ', s.last_name) as student_name,
                    r.room_number, hb.block_name
             FROM room_allocations ra
             JOIN students s ON ra.student_id = s.id
             JOIN rooms r ON ra.room_id = r.id
             JOIN hostel_blocks hb ON r.block_id = hb.id
             WHERE ra.id = ?`,
            [result[0].id]
        );

        return sendSuccess(res, 'Room allocated successfully', newAllocation[0], 201);

    } catch (error) {
        return next(error);
    }
};

/**
 * Update allocation
 * PUT /api/admin/allocations/:id
 */
const updateAllocation = async (req, res, next) => {
    try {
        const allocationId = req.params.id;
        const { endDate, rentAmount, paymentStatus, allocationStatus, terminationReason } = req.body;

        const updated = await query(
            `UPDATE room_allocations
             SET end_date = COALESCE(?, end_date), rent_amount = COALESCE(?, rent_amount),
                 payment_status = COALESCE(?, payment_status), allocation_status = COALESCE(?, allocation_status),
                 termination_reason = COALESCE(?, termination_reason)
             WHERE id = ? RETURNING *`,
            [endDate ?? null, rentAmount ?? null, paymentStatus ?? null, allocationStatus ?? null,
             terminationReason ?? null, allocationId]
        );

        if (updated.length === 0) {
            return sendError(res, 'Allocation not found', 404);
        }

        return sendSuccess(res, 'Allocation updated successfully', updated[0]);

    } catch (error) {
        return next(error);
    }
};

/**
 * Terminate allocation
 * PUT /api/admin/allocations/:id/terminate
 */
const terminateAllocation = async (req, res, next) => {
    try {
        const allocationId = req.params.id;
        const { reason } = req.body;

        const terminated = await query(
            `UPDATE room_allocations
             SET allocation_status = 'terminated',
                 termination_reason = ?,
                 end_date = CURRENT_DATE
             WHERE id = ? AND allocation_status = 'active' RETURNING id`,
            [reason || 'Terminated by admin', allocationId]
        );

        if (terminated.length === 0) {
            return sendError(res, 'No active allocation with that ID', 404);
        }

        return sendSuccess(res, 'Allocation terminated successfully');

    } catch (error) {
        return next(error);
    }
};

// =====================================================
// Reports Controllers
// =====================================================

/**
 * Get occupancy report
 * GET /api/admin/reports/occupancy
 */
const getOccupancyReport = async (req, res, next) => {
    try {
        const { blockId } = req.query;

        let whereClause = '';
        const params = [];

        if (blockId) {
            whereClause = 'WHERE hb.id = ?';
            params.push(blockId);
        }

        const occupancy = await query(
            `SELECT 
                hb.block_name,
                hb.block_code,
                hb.gender_type,
                COUNT(r.id) as total_rooms,
                SUM(r.capacity) as total_beds,
                SUM(r.occupied_beds) as occupied_beds,
                SUM(r.available_beds) as available_beds,
                COALESCE(ROUND(SUM(r.occupied_beds)::numeric / NULLIF(SUM(r.capacity), 0) * 100, 2), 0) as occupancy_rate
             FROM hostel_blocks hb
             LEFT JOIN rooms r ON hb.id = r.block_id AND r.is_active = TRUE
             ${whereClause}
             GROUP BY hb.id, hb.block_name, hb.block_code, hb.gender_type
             ORDER BY hb.block_name`,
            params
        );

        // Get room type distribution
        const roomTypeDist = await query(
            `SELECT 
                room_type,
                COUNT(*) as count,
                SUM(capacity) as total_capacity,
                SUM(occupied_beds) as total_occupied
             FROM rooms
             WHERE is_active = TRUE
             GROUP BY room_type`
        );

        return sendSuccess(res, 'Occupancy report retrieved successfully', {
            occupancyByBlock: occupancy,
            roomTypeDistribution: roomTypeDist
        });

    } catch (error) {
        return next(error);
    }
};

/**
 * Get student statistics
 * GET /api/admin/reports/students
 */
const getStudentStatistics = async (req, res, next) => {
    try {
        // Students by course
        const byCourse = await query(
            `SELECT course, COUNT(*) as count 
             FROM students 
             WHERE is_active = TRUE 
             GROUP BY course 
             ORDER BY count DESC`
        );

        // Students by year
        const byYear = await query(
            `SELECT year_of_study, COUNT(*) as count 
             FROM students 
             WHERE is_active = TRUE 
             GROUP BY year_of_study 
             ORDER BY year_of_study`
        );

        // Students by gender
        const byGender = await query(
            `SELECT gender, COUNT(*) as count 
             FROM students 
             WHERE is_active = TRUE 
             GROUP BY gender`
        );

        // Allocation status
        const allocationStatus = await query(
            `SELECT 
                COUNT(DISTINCT s.id) as total_students,
                COUNT(DISTINCT CASE WHEN ra.id IS NOT NULL THEN s.id END) as allocated_students,
                COUNT(DISTINCT CASE WHEN ra.id IS NULL THEN s.id END) as unallocated_students
             FROM students s
             LEFT JOIN room_allocations ra ON s.id = ra.student_id AND ra.allocation_status = 'active'
             WHERE s.is_active = TRUE`
        );

        return sendSuccess(res, 'Student statistics retrieved successfully', {
            byCourse,
            byYear,
            byGender,
            allocationStatus: allocationStatus[0]
        });

    } catch (error) {
        return next(error);
    }
};

// =====================================================
// Fee & Complaint Controllers
// =====================================================

/**
 * List fee payments
 * GET /api/admin/payments
 */
const getAllPayments = async (req, res, next) => {
    try {
        const { page, limit, offset } = getPaginationParams(req);
        const { status, search } = req.query;
        let whereClause = 'WHERE 1=1';
        const params = [];
        if (status) {
            whereClause += ' AND p.status = ?';
            params.push(status);
        }
        if (search) {
            whereClause += ` AND (s.student_id ILIKE ? OR s.first_name || ' ' || s.last_name ILIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        const from = `FROM payments p JOIN students s ON p.student_id = s.id
                      JOIN room_allocations ra ON p.allocation_id = ra.id
                      JOIN rooms r ON ra.room_id = r.id
                      JOIN hostel_blocks hb ON r.block_id = hb.id ${whereClause}`;
        const [{ total }] = await query(`SELECT COUNT(*) AS total ${from}`, params);
        const payments = await query(
            `SELECT p.*, s.student_id AS student_code, s.first_name || ' ' || s.last_name AS student_name,
                    r.room_number, hb.block_code
             ${from}
             ORDER BY (p.status = 'pending') DESC, p.payment_date DESC, p.id DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        const [summary] = await query(
            `SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS total_collected,
                    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS total_pending,
                    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count
             FROM payments`
        );
        return sendSuccess(res, 'Payments retrieved successfully', {
            payments,
            summary,
            pagination: createPagination(page, limit, total)
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Record a fee payment against an allocation
 * POST /api/admin/payments
 */
const recordPayment = async (req, res, next) => {
    try {
        const { allocationId, amount, paymentType, paymentMethod, monthYear, transactionId, remarks } = req.body;
        const allocation = await query('SELECT student_id FROM room_allocations WHERE id = ?', [allocationId]);
        if (allocation.length === 0) {
            return sendError(res, 'Allocation not found', 404);
        }
        const [payment] = await query(
            `INSERT INTO payments (allocation_id, student_id, amount, payment_type, payment_method, transaction_id,
                month_year, status, remarks, recorded_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?) RETURNING *`,
            [allocationId, allocation[0].student_id, amount, paymentType || 'rent', paymentMethod,
             transactionId || null, monthYear || null, remarks || null, req.user.id]
        );
        return sendSuccess(res, 'Payment recorded successfully', payment, 201);
    } catch (error) {
        return next(error);
    }
};

/**
 * Mark a pending payment as received
 * PUT /api/admin/payments/:id/complete
 */
const completePayment = async (req, res, next) => {
    try {
        const { paymentMethod, transactionId } = req.body;
        const updated = await query(
            `UPDATE payments SET status = 'completed', payment_date = NOW(), recorded_by = ?,
                    payment_method = COALESCE(?, payment_method), transaction_id = COALESCE(?, transaction_id)
             WHERE id = ? AND status = 'pending' RETURNING *`,
            [req.user.id, paymentMethod ?? null, transactionId ?? null, req.params.id]
        );
        if (updated.length === 0) {
            return sendError(res, 'No pending payment with that ID', 404);
        }
        return sendSuccess(res, 'Payment marked as received', updated[0]);
    } catch (error) {
        return next(error);
    }
};

/**
 * List complaints
 * GET /api/admin/complaints
 */
const getAllComplaints = async (req, res, next) => {
    try {
        const { page, limit, offset } = getPaginationParams(req);
        const { status, category } = req.query;
        let whereClause = 'WHERE 1=1';
        const params = [];
        if (status) {
            whereClause += ' AND c.status = ?';
            params.push(status);
        }
        if (category) {
            whereClause += ' AND c.category = ?';
            params.push(category);
        }
        const [{ total }] = await query(`SELECT COUNT(*) AS total FROM complaints c ${whereClause}`, params);
        const complaints = await query(
            `SELECT c.*, s.student_id AS student_code, s.first_name || ' ' || s.last_name AS student_name,
                    r.room_number, hb.block_code
             FROM complaints c
             JOIN students s ON c.student_id = s.id
             LEFT JOIN rooms r ON c.room_id = r.id
             LEFT JOIN hostel_blocks hb ON r.block_id = hb.id
             ${whereClause}
             ORDER BY CASE c.status WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
                      CASE c.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                      c.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        return sendSuccess(res, 'Complaints retrieved successfully', {
            complaints,
            pagination: createPagination(page, limit, total)
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Update a complaint's status, priority or response
 * PUT /api/admin/complaints/:id
 */
const updateComplaint = async (req, res, next) => {
    try {
        const { status, priority, adminResponse } = req.body;
        const updated = await query(
            `UPDATE complaints
             SET status = COALESCE(?, status), priority = COALESCE(?, priority),
                 admin_response = COALESCE(?, admin_response),
                 resolved_at = CASE WHEN COALESCE(?, status) IN ('resolved', 'closed') THEN COALESCE(resolved_at, NOW()) ELSE NULL END
             WHERE id = ? RETURNING *`,
            [status ?? null, priority ?? null, adminResponse ?? null, status ?? null, req.params.id]
        );
        if (updated.length === 0) {
            return sendError(res, 'Complaint not found', 404);
        }
        return sendSuccess(res, 'Complaint updated successfully', updated[0]);
    } catch (error) {
        return next(error);
    }
};

// =====================================================
// Export all controllers
// =====================================================

module.exports = {
    // Authentication
    login,
    getProfile,
    createAdmin,
    
    // Dashboard
    getDashboard,
    
    // Students
    getAllStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
    
    // Blocks
    getAllBlocks,
    createBlock,
    updateBlock,
    deleteBlock,
    
    // Rooms
    getAllRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom,
    
    // Applications
    getAllApplications,
    processApplication,
    
    // Allocations
    getAllAllocations,
    createAllocation,
    updateAllocation,
    terminateAllocation,
    
    // Reports
    getOccupancyReport,
    getStudentStatistics,

    // Fees & complaints
    getAllPayments,
    recordPayment,
    completePayment,
    getAllComplaints,
    updateComplaint
};