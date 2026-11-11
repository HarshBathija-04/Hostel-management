const { query, transaction } = require('../config/database');
const {
    hashPassword,
    comparePassword,
    generateTokens,
    sendSuccess,
    sendError,
    getPaginationParams,
    createPagination,
    omit,
    isDemoAccount,
    buildWhere,
    buildSet,
    catchErrors
} = require('../utils/helpers');

const login = async (req, res) => {
    const { username, password } = req.body;
    const admins = await query(
        `SELECT id, username, email, password, full_name, phone, role, is_active, last_login
         FROM admin WHERE username = ?`,
        [username]
    );
    if (admins.length === 0) {
        return sendError(res, 'Invalid username or password', 401);
    }
    const admin = admins[0];
    if (!admin.is_active) {
        return sendError(res, 'Your account has been deactivated', 403);
    }
    const isPasswordValid = await comparePassword(password, admin.password);
    if (!isPasswordValid) {
        return sendError(res, 'Invalid username or password', 401);
    }
    await query(
        'UPDATE admin SET last_login = NOW() WHERE id = ?',
        [admin.id]
    );
    const tokens = generateTokens({
        id: admin.id,
        userType: 'admin',
        email: admin.email,
        role: admin.role
    });
    const adminData = omit(admin, ['password']);
    return sendSuccess(res, 'Login successful', {
        admin: adminData,
        ...tokens
    });
};

const getProfile = async (req, res) => {
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
};

const createAdmin = async (req, res) => {
    const { username, password, email, fullName, phone, role } = req.body;
    const existing = await query(
        'SELECT id FROM admin WHERE username = ? OR email = ?',
        [username, email]
    );
    if (existing.length > 0) {
        return sendError(res, 'Username or email already exists', 409);
    }
    const hashedPassword = await hashPassword(password);
    const result = await query(
        `INSERT INTO admin (username, password, email, full_name, phone, role)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING id, username, email, full_name, phone, role, is_active, created_at`,
        [username, hashedPassword, email, fullName, phone || null, role || 'admin']
    );
    return sendSuccess(res, 'Admin created successfully', result[0], 201);
};

const getDashboard = async (req, res) => {
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
    const recentApplications = await query(
        `SELECT ra.*, s.student_id, CONCAT(s.first_name, ' ', s.last_name) as student_name
         FROM room_applications ra
         JOIN students s ON ra.student_id = s.id
         ORDER BY ra.application_date DESC
         LIMIT 5`
    );
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
         GROUP BY hb.id, hb.block_name
         ORDER BY hb.block_name`
    );
    const [extra] = await query(
        `SELECT
            (SELECT COUNT(*) FROM students WHERE is_active = TRUE) AS total_students,
            (SELECT COUNT(*) FROM rooms WHERE is_active = TRUE) AS total_rooms,
            (SELECT COUNT(*) FROM room_allocations WHERE allocation_status = 'active') AS active_allocations,
            (SELECT COUNT(*) FROM room_applications WHERE status = 'pending') AS pending_applications,
            (SELECT COUNT(*) FROM complaints WHERE status IN ('open', 'in_progress')) AS open_complaints,
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed'
                AND date_trunc('month', payment_date) = date_trunc('month', NOW())) AS collected_this_month,
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'pending') AS pending_dues`
    );
    return sendSuccess(res, 'Dashboard data retrieved successfully', {
        statistics: {
            totalStudents: extra.total_students,
            totalRooms: extra.total_rooms,
            activeAllocations: extra.active_allocations,
            pendingApplications: extra.pending_applications,
            openComplaints: extra.open_complaints,
            collectedThisMonth: extra.collected_this_month,
            pendingDues: extra.pending_dues
        },
        roomSummary: roomSummary[0],
        recentApplications,
        recentAllocations,
        occupancyByBlock
    });
};

const getAllStudents = async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req);
    const { search, course, year, gender } = req.query;
    const { whereClause, params } = buildWhere([
        ['(s.student_id ILIKE ? OR s.first_name ILIKE ? OR s.last_name ILIKE ? OR s.email ILIKE ?)', search && `%${search}%`],
        ['s.course = ?', course],
        ['s.year_of_study = ?', year],
        ['s.gender = ?', gender]
    ]);
    const [{ total }] = await query(`SELECT COUNT(*) as total FROM students s ${whereClause}`, params);
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
    const sanitizedStudents = students.map(s => omit(s, ['password']));
    return sendSuccess(res, 'Students retrieved successfully', {
        students: sanitizedStudents,
        pagination: createPagination(page, limit, total)
    });
};

const getStudentById = async (req, res) => {
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
    const applications = await query(
        `SELECT ra.*, hb.block_name
         FROM room_applications ra
         LEFT JOIN hostel_blocks hb ON ra.preferred_block_id = hb.id
         WHERE ra.student_id = ?
         ORDER BY ra.application_date DESC`,
        [studentId]
    );
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
};

const updateStudent = async (req, res) => {
    const studentId = req.params.id;
    const updates = req.body;
    const existing = await query(
        'SELECT id, student_id FROM students WHERE id = ?',
        [studentId]
    );
    if (existing.length === 0) {
        return sendError(res, 'Student not found', 404);
    }
    if (updates.isActive === false && isDemoAccount(existing[0].student_id)) {
        return sendError(res, 'The shared demo student cannot be deactivated', 403);
    }
    const { setClause, values } = buildSet(updates, [
        'firstName', 'lastName', 'phone', 'address', 'course', 'department', 'yearOfStudy',
        'emergencyContactName', 'emergencyContactPhone', 'isActive'
    ]);
    if (!setClause) {
        return sendError(res, 'No valid fields to update', 400);
    }
    await query(`UPDATE students SET ${setClause} WHERE id = ?`, [...values, studentId]);
    return sendSuccess(res, 'Student updated successfully');
};

const deleteStudent = async (req, res) => {
    const studentId = req.params.id;
    const target = await query('SELECT student_id FROM students WHERE id = ?', [studentId]);
    if (target.length === 0) {
        return sendError(res, 'Student not found', 404);
    }
    if (isDemoAccount(target[0].student_id)) {
        return sendError(res, 'The shared demo student cannot be deactivated', 403);
    }
    const activeAllocation = await query(
        `SELECT id FROM room_allocations
         WHERE student_id = ? AND allocation_status = 'active'`,
        [studentId]
    );
    if (activeAllocation.length > 0) {
        return sendError(res, 'Cannot delete student with active room allocation', 400);
    }
    await query(
        'UPDATE students SET is_active = FALSE WHERE id = ?',
        [studentId]
    );
    return sendSuccess(res, 'Student deactivated successfully');
};

const getAllBlocks = async (req, res) => {
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
};

const createBlock = async (req, res) => {
    const { blockName, blockCode, genderType, description, totalFloors, wardenName, wardenContact } = req.body;
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
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        [blockName, blockCode, genderType, description || null, totalFloors || 1, wardenName || null, wardenContact || null]
    );
    return sendSuccess(res, 'Hostel block created successfully', result[0], 201);
};

const updateBlock = async (req, res) => {
    const blockId = req.params.id;
    const { blockName, genderType, description, totalFloors, wardenName, wardenContact, isActive } = req.body;
    const updated = await query(
        // Partial update: omitted fields keep their current value.
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
};

const deleteBlock = async (req, res) => {
    const blockId = req.params.id;
    const rooms = await query(
        'SELECT id FROM rooms WHERE block_id = ? AND is_active = TRUE',
        [blockId]
    );
    if (rooms.length > 0) {
        return sendError(res, 'Cannot delete block with active rooms', 400);
    }
    await query('DELETE FROM hostel_blocks WHERE id = ?', [blockId]);
    return sendSuccess(res, 'Hostel block deleted successfully');
};

const getAllRooms = async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req);
    const { blockId, status, roomType } = req.query;
    const { whereClause, params } = buildWhere([
        ['r.block_id = ?', blockId],
        ['r.room_status = ?', status],
        ['r.room_type = ?', roomType]
    ]);
    const [{ total }] = await query(`SELECT COUNT(*) as total FROM rooms r ${whereClause}`, params);
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
};

const getRoomById = async (req, res) => {
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
};

const createRoom = async (req, res) => {
    const { roomNumber, blockId, floorNumber, roomType, capacity, facilities, monthlyRent } = req.body;
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
};

const updateRoom = async (req, res) => {
    const roomId = req.params.id;
    const { roomNumber, floorNumber, roomType, capacity, facilities, monthlyRent, roomStatus, isActive } = req.body;
    const updated = await query(
        // Partial update; the rooms_beds_in_range CHECK rejects shrinking below occupied beds.
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
};

const deleteRoom = async (req, res) => {
    const roomId = req.params.id;
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
};

const getAllApplications = async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req);
    const { status, studentId } = req.query;
    const { whereClause, params } = buildWhere([
        ['ra.status = ?', status],
        ['ra.student_id = ?', studentId]
    ]);
    const [{ total }] = await query(`SELECT COUNT(*) as total FROM room_applications ra ${whereClause}`, params);
    const applications = await query(
        `SELECT ra.*,
                s.student_id, CONCAT(s.first_name, ' ', s.last_name) as student_name,
                s.email, s.course, s.year_of_study, s.gender, ra.student_id AS student_db_id,
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
};

const processApplication = async (req, res) => {
    const applicationId = req.params.id;
    const adminId = req.user.id;
    const { status, adminRemarks } = req.body;
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
    await query(
        `UPDATE room_applications
         SET status = ?, admin_remarks = ?, processed_by = ?, processed_at = NOW()
         WHERE id = ?`,
        [status, adminRemarks || null, adminId, applicationId]
    );
    return sendSuccess(res, `Application ${status} successfully`);
};

const getAllAllocations = async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req);
    const { status, roomId, studentId } = req.query;
    const { whereClause, params } = buildWhere([
        ['ra.allocation_status = ?', status],
        ['ra.room_id = ?', roomId],
        ['ra.student_id = ?', studentId]
    ]);
    const [{ total }] = await query(`SELECT COUNT(*) as total FROM room_allocations ra ${whereClause}`, params);
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
};

const createAllocation = async (req, res) => {
    const adminId = req.user.id;
    const { studentId, roomId, applicationId, bedNumber, startDate, endDate, rentAmount, securityDeposit } = req.body;
    const student = await query('SELECT gender, is_active FROM students WHERE id = ?', [studentId]);
    if (student.length === 0 || !student[0].is_active) {
        return sendError(res, 'Student not found or inactive', 404);
    }
    const existingAllocation = await query(
        `SELECT id FROM room_allocations
         WHERE student_id = ? AND allocation_status = 'active'`,
        [studentId]
    );
    if (existingAllocation.length > 0) {
        return sendError(res, 'Student already has an active allocation', 409);
    }
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
};

const updateAllocation = async (req, res) => {
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
};

const terminateAllocation = async (req, res) => {
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
};

const getOccupancyReport = async (req, res) => {
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
};

const getStudentStatistics = async (req, res) => {
    const byCourse = await query(
        `SELECT course, COUNT(*) as count
         FROM students
         WHERE is_active = TRUE
         GROUP BY course
         ORDER BY count DESC`
    );
    const byYear = await query(
        `SELECT year_of_study, COUNT(*) as count
         FROM students
         WHERE is_active = TRUE
         GROUP BY year_of_study
         ORDER BY year_of_study`
    );
    const byGender = await query(
        `SELECT gender, COUNT(*) as count
         FROM students
         WHERE is_active = TRUE
         GROUP BY gender`
    );
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
};

const getAllPayments = async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req);
    const { status, search } = req.query;
    const { whereClause, params } = buildWhere([
        ['p.status = ?', status],
        [`(s.student_id ILIKE ? OR s.first_name || ' ' || s.last_name ILIKE ?)`, search && `%${search}%`]
    ]);
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
};

const recordPayment = async (req, res) => {
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
};

const completePayment = async (req, res) => {
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
};

const getAllComplaints = async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req);
    const { status, category } = req.query;
    const { whereClause, params } = buildWhere([
        ['c.status = ?', status],
        ['c.category = ?', category]
    ]);
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
};

const updateComplaint = async (req, res) => {
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
};

module.exports = catchErrors({
    login,
    getProfile,
    createAdmin,
    getDashboard,
    getAllStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
    getAllBlocks,
    createBlock,
    updateBlock,
    deleteBlock,
    getAllRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom,
    getAllApplications,
    processApplication,
    getAllAllocations,
    createAllocation,
    updateAllocation,
    terminateAllocation,
    getOccupancyReport,
    getStudentStatistics,
    getAllPayments,
    recordPayment,
    completePayment,
    getAllComplaints,
    updateComplaint
});
