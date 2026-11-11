/**
 * Idempotent demo seed: inserts realistic hostel data once (skips if the demo admin exists).
 * Demo logins - admin: superadmin / admin123, student: STU2024001 / student123.
 * Usage: node db/seed.js
 */
const bcrypt = require('bcryptjs');
const { pool, transaction } = require('../config/database');

const blocks = [
    ['Boys Block A', 'BBA', 'male', 'Main boys block with AC rooms and attached bathrooms', 4, 'Mr. Ramesh Iyer', '9876543220'],
    ['Boys Block B', 'BBB', 'male', 'Budget-friendly boys block close to the sports complex', 3, 'Mr. Sanjay Mishra', '9876543221'],
    ['Girls Block A', 'GBA', 'female', 'Main girls block with 24x7 security and a reading room', 4, 'Mrs. Lata Deshpande', '9876543222'],
    ['Girls Block B', 'GBB', 'female', 'Girls block next to the central library', 3, 'Ms. Farah Khan', '9876543223'],
    ['International House', 'INT', 'mixed', 'Furnished rooms with kitchenettes for international and exchange students', 2, 'Dr. Michael Chen', '9876543224']
];

const AC = 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe';
const FAN = 'WiFi, Fan, Common Bathroom, Study Table, Wardrobe';
const SUITE = 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe, Mini Fridge, Kitchenette';
// [block, room, floor, type, capacity, facilities, rent]
const rooms = [
    ['BBA', '101', 1, 'double', 2, AC, 8000], ['BBA', '102', 1, 'double', 2, AC, 8000],
    ['BBA', '103', 1, 'triple', 3, AC, 6000], ['BBA', '104', 1, 'single', 1, `${AC}, Mini Fridge`, 12000],
    ['BBA', '201', 2, 'double', 2, AC, 8000], ['BBA', '202', 2, 'double', 2, AC, 8000],
    ['BBA', '203', 2, 'triple', 3, AC, 6000], ['BBA', '301', 3, 'double', 2, AC, 8000],
    ['BBA', '302', 3, 'double', 2, AC, 8000], ['BBA', '401', 4, 'quad', 4, 'WiFi, AC, Common Bathroom, Study Table, Wardrobe', 5000],
    ['BBB', '101', 1, 'double', 2, FAN, 5000], ['BBB', '102', 1, 'double', 2, FAN, 5000],
    ['BBB', '103', 1, 'triple', 3, FAN, 4000], ['BBB', '201', 2, 'double', 2, FAN, 5000],
    ['BBB', '202', 2, 'double', 2, FAN, 5000], ['BBB', '301', 3, 'double', 2, FAN, 5000],
    ['GBA', '101', 1, 'double', 2, AC, 8000], ['GBA', '102', 1, 'double', 2, AC, 8000],
    ['GBA', '103', 1, 'single', 1, `${AC}, Mini Fridge`, 12000], ['GBA', '201', 2, 'double', 2, AC, 8000],
    ['GBA', '202', 2, 'double', 2, AC, 8000], ['GBA', '203', 2, 'triple', 3, AC, 6000],
    ['GBA', '301', 3, 'double', 2, AC, 8000], ['GBA', '302', 3, 'double', 2, AC, 8000],
    ['GBB', '101', 1, 'double', 2, FAN, 5000], ['GBB', '102', 1, 'double', 2, FAN, 5000],
    ['GBB', '201', 2, 'double', 2, FAN, 5000], ['GBB', '202', 2, 'triple', 3, FAN, 4000],
    ['GBB', '301', 3, 'double', 2, FAN, 5000],
    ['INT', '101', 1, 'single', 1, SUITE, 15000], ['INT', '102', 1, 'single', 1, SUITE, 15000],
    ['INT', '103', 1, 'double', 2, `${AC}, Mini Fridge`, 10000], ['INT', '201', 2, 'single', 1, SUITE, 15000],
    ['INT', '202', 2, 'double', 2, `${AC}, Mini Fridge`, 10000]
];

// [studentId, first, last, gender, course, department, year, dob, city]
const students = [
    ['STU2024001', 'Aarav', 'Sharma', 'male', 'B.Tech Computer Science', 'Engineering', 3, '2004-03-15', 'Jaipur'],
    ['STU2024002', 'Priya', 'Patel', 'female', 'B.Tech Electronics', 'Engineering', 2, '2005-07-22', 'Ahmedabad'],
    ['STU2024003', 'Rohan', 'Mehta', 'male', 'B.Tech Mechanical', 'Engineering', 1, '2006-01-10', 'Pune'],
    ['STU2024004', 'Kabir', 'Singh', 'male', 'B.Tech Computer Science', 'Engineering', 3, '2004-11-05', 'Chandigarh'],
    ['STU2024005', 'Ananya', 'Iyer', 'female', 'B.Sc Biotechnology', 'Life Sciences', 4, '2003-05-18', 'Chennai'],
    ['STU2024006', 'Vikram', 'Reddy', 'male', 'B.Tech Civil', 'Engineering', 2, '2005-09-30', 'Hyderabad'],
    ['STU2024007', 'Sneha', 'Kulkarni', 'female', 'MBBS', 'Health Sciences', 2, '2005-12-12', 'Nagpur'],
    ['STU2024008', 'Arjun', 'Nair', 'male', 'B.Sc Physics', 'Science', 3, '2004-04-25', 'Kochi'],
    ['STU2024009', 'Ishita', 'Gupta', 'female', 'B.Sc Chemistry', 'Science', 1, '2006-06-08', 'Lucknow'],
    ['STU2024010', 'Aditya', 'Verma', 'male', 'B.Sc Mathematics', 'Science', 2, '2005-08-20', 'Bhopal'],
    ['STU2024011', 'Meera', 'Joshi', 'female', 'B.A. Economics', 'Social Sciences', 3, '2004-02-14', 'Indore'],
    ['STU2024012', 'Daniel', 'Okafor', 'male', 'MBA', 'Management', 1, '2001-10-03', 'Lagos, Nigeria'],
    ['STU2024013', 'Yuki', 'Tanaka', 'female', 'M.Des Interaction Design', 'Design', 2, '2002-01-27', 'Osaka, Japan'],
    ['STU2024014', 'Rahul', 'Desai', 'male', 'B.Tech Information Technology', 'Engineering', 4, '2003-07-09', 'Surat'],
    ['STU2024015', 'Kavya', 'Menon', 'female', 'B.Arch', 'Architecture', 1, '2006-03-03', 'Thrissur'],
    ['STU2024016', 'Siddharth', 'Rao', 'male', 'B.Tech Electrical', 'Engineering', 2, '2005-05-21', 'Mysuru']
];

// Active stays this academic year: [student, block, room, bed]
const allocations = [
    ['STU2024001', 'BBA', '201', 1], ['STU2024004', 'BBA', '201', 2],
    ['STU2024002', 'GBA', '101', 1], ['STU2024007', 'GBA', '101', 2],
    ['STU2024005', 'GBA', '103', 1], ['STU2024006', 'BBB', '103', 1],
    ['STU2024011', 'GBB', '202', 1], ['STU2024012', 'INT', '101', 1],
    ['STU2024013', 'INT', '103', 1]
];

// Open applications: [student, preferred block, type, status, remarks, special requirements]
const openApplications = [
    ['STU2024003', 'BBB', 'double', 'pending', null, 'First-year student, would like a room near the mess'],
    ['STU2024008', 'BBA', 'double', 'pending', null, 'Need a quiet room for late-night lab work'],
    ['STU2024009', 'GBB', 'any', 'pending', null, null],
    ['STU2024015', 'GBA', 'triple', 'pending', null, 'Prefer to share with other first-year students'],
    ['STU2024014', 'BBA', 'single', 'waitlisted', 'No single rooms free in Block A; on the waitlist', 'Final-year project, single room preferred'],
    ['STU2024010', 'BBA', 'single', 'rejected', 'Single rooms are reserved for final-year students', null]
];

// [student, category, title, description, priority, status, response]
const complaints = [
    ['STU2024001', 'internet', 'WiFi drops every evening', 'The WiFi in room 201 disconnects between 8 and 11 pm almost every day.', 'high', 'in_progress', 'IT team is replacing the floor access point this week.'],
    ['STU2024001', 'furniture', 'Broken study chair', 'One leg of the study chair is cracked and wobbles.', 'low', 'resolved', 'Chair replaced on the last maintenance round.'],
    ['STU2024002', 'plumbing', 'Leaking bathroom tap', 'The washbasin tap keeps dripping and the floor stays wet.', 'medium', 'open', null],
    ['STU2024006', 'electrical', 'Ceiling fan not working', 'The fan in room 103 stopped working after the power cut.', 'high', 'open', null],
    ['STU2024011', 'cleaning', 'Corridor not cleaned', 'The second-floor corridor has not been cleaned for three days.', 'medium', 'resolved', 'Housekeeping schedule fixed; daily cleaning resumed.'],
    ['STU2024012', 'electrical', 'Kitchenette socket sparks', 'The socket near the kitchenette sparks when the kettle is plugged in.', 'high', 'in_progress', 'Electrician booked; please avoid using the socket.'],
    ['STU2024013', 'other', 'Request for a bookshelf', 'Could a small bookshelf be added to room 103?', 'low', 'closed', 'Bookshelves will be added in the next furniture order.']
];

const iso = (d) => d.toISOString().slice(0, 10);

// Academic year starts 15 July; seed dates relative to today so the demo always looks current.
function academicYear(now = new Date()) {
    const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    const months = [];
    for (let d = new Date(Date.UTC(startYear, 6, 1)); d <= now; d.setUTCMonth(d.getUTCMonth() + 1)) {
        months.push(iso(d).slice(0, 7));
    }
    return { start: `${startYear}-07-15`, end: `${startYear + 1}-06-30`, allocated: `${startYear}-07-01`, months };
}

async function seed({ log = console.log } = {}) {
    const exists = await pool.query("SELECT 1 FROM admin WHERE username = 'superadmin'");
    if (exists.rowCount > 0) {
        log('Seed data already present, skipping');
        return false;
    }

    const adminHash = await bcrypt.hash('admin123', 10);
    const studentHash = await bcrypt.hash('student123', 10);
    const ay = academicYear();

    await transaction(async (db) => {
        const adminRows = await db.query(
            `INSERT INTO admin (username, password, email, full_name, phone, role) VALUES
             ('superadmin', ?, 'superadmin@hostel.edu', 'Super Administrator', '9876543210', 'super_admin'),
             ('warden.rajesh', ?, 'rajesh.kumar@hostel.edu', 'Rajesh Kumar', '9876543211', 'admin'),
             ('warden.neha', ?, 'neha.kapoor@hostel.edu', 'Neha Kapoor', '9876543212', 'admin')
             RETURNING id`,
            [adminHash, adminHash, adminHash]
        );
        const adminId = adminRows[0].id;

        const blockIds = {};
        for (const [name, code, gender, desc, floors, warden, contact] of blocks) {
            const [row] = await db.query(
                `INSERT INTO hostel_blocks (block_name, block_code, gender_type, description, total_floors, warden_name, warden_contact)
                 VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
                [name, code, gender, desc, floors, warden, contact]
            );
            blockIds[code] = row.id;
        }

        const roomIds = {};
        const roomRent = {};
        for (const [code, number, floor, type, capacity, facilities, rent] of rooms) {
            const status = code === 'BBB' && number === '301' ? 'maintenance' : 'available';
            const [row] = await db.query(
                `INSERT INTO rooms (room_number, block_id, floor_number, room_type, capacity, room_status, facilities, monthly_rent)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
                [number, blockIds[code], floor, type, capacity, status, facilities, rent]
            );
            roomIds[`${code}-${number}`] = row.id;
            roomRent[`${code}-${number}`] = rent;
        }

        const studentIds = {};
        for (const [sid, first, last, gender, course, dept, year, dob, city] of students) {
            const n = sid.slice(-3);
            const [row] = await db.query(
                `INSERT INTO students (student_id, password, email, first_name, last_name, date_of_birth, gender, phone,
                    address, course, department, year_of_study, enrollment_date, emergency_contact_name,
                    emergency_contact_phone, email_verified)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE) RETURNING id`,
                [
                    sid, studentHash, `${first.toLowerCase()}.${last.toLowerCase()}@university.edu`, first, last, dob,
                    gender, `98765${43200 + Number(n)}`, city.includes(',') ? city : `${city}, India`,
                    course, dept, year, `${Number(ay.start.slice(0, 4)) - year + 1}-08-01`, `Parent of ${first}`, `98765${44200 + Number(n)}`
                ]
            );
            studentIds[sid] = row.id;
        }

        // A finished stay from last year, so allocation history is not empty.
        const lastYear = Number(ay.start.slice(0, 4)) - 1;
        await db.query(
            `INSERT INTO room_allocations (student_id, room_id, bed_number, allocation_date, start_date, end_date,
                rent_amount, security_deposit, payment_status, allocation_status, termination_reason, allocated_by)
             VALUES (?, ?, 1, ?, ?, ?, 8000, 16000, 'refunded', 'expired', 'Academic year ended', ?)`,
            [studentIds.STU2024014, roomIds['BBA-301'], `${lastYear}-07-01`, `${lastYear}-07-15`, `${lastYear + 1}-06-30`, adminId]
        );

        const currentMonth = ay.months[ay.months.length - 1];
        for (const [sid, code, number, bed] of allocations) {
            const rent = roomRent[`${code}-${number}`];
            const [app] = await db.query(
                `INSERT INTO room_applications (student_id, preferred_block_id, preferred_room_type, application_date,
                    preferred_start_date, duration_months, status, admin_remarks, processed_by, processed_at)
                 VALUES (?, ?, 'any', ?::date - 20, ?, 12, 'approved', ?, ?, ?::date - 5) RETURNING id`,
                [studentIds[sid], blockIds[code], ay.allocated, ay.start, `Allotted ${code} room ${number}`, adminId, ay.allocated]
            );
            // The last two students still owe this month's rent.
            const owesThisMonth = sid === 'STU2024011' || sid === 'STU2024006';
            const [alloc] = await db.query(
                `INSERT INTO room_allocations (student_id, room_id, application_id, bed_number, allocation_date, start_date,
                    end_date, rent_amount, security_deposit, payment_status, allocated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
                [studentIds[sid], roomIds[`${code}-${number}`], app.id, bed, ay.allocated, ay.start, ay.end, rent, rent * 2,
                    owesThisMonth ? 'partial' : 'paid', adminId]
            );
            await db.query(
                `INSERT INTO payments (allocation_id, student_id, amount, payment_type, payment_method, transaction_id,
                    payment_date, status, remarks, recorded_by)
                 VALUES (?, ?, ?, 'security_deposit', 'online', ?, ?, 'completed', 'Refundable security deposit', ?)`,
                [alloc.id, studentIds[sid], rent * 2, `TXN${sid.slice(-3)}D`, ay.allocated, adminId]
            );
            for (const month of ay.months) {
                const pending = owesThisMonth && month === currentMonth;
                await db.query(
                    `INSERT INTO payments (allocation_id, student_id, amount, payment_type, payment_method, transaction_id,
                        payment_date, month_year, status, remarks, recorded_by)
                     VALUES (?, ?, ?, 'rent', ?, ?, ?, ?, ?, ?, ?)`,
                    [alloc.id, studentIds[sid], rent, sid === 'STU2024012' ? 'bank_transfer' : 'online',
                        pending ? null : `TXN${sid.slice(-3)}${month.replace('-', '')}`, `${month}-05`, month,
                        pending ? 'pending' : 'completed', `Rent for ${month}`, pending ? null : adminId]
                );
            }
        }

        for (const [sid, code, type, status, remarks, special] of openApplications) {
            const processed = status !== 'pending';
            await db.query(
                `INSERT INTO room_applications (student_id, preferred_block_id, preferred_room_type, application_date,
                    preferred_start_date, duration_months, special_requirements, status, admin_remarks, processed_by, processed_at)
                 VALUES (?, ?, ?, NOW() - INTERVAL '6 days', CURRENT_DATE + 20, 10, ?, ?, ?, ?, ?)`,
                [studentIds[sid], blockIds[code], type, special, status, remarks, processed ? adminId : null,
                    processed ? new Date(Date.now() - 2 * 864e5) : null]
            );
        }

        const roomOf = Object.fromEntries(allocations.map(([sid, code, number]) => [sid, roomIds[`${code}-${number}`]]));
        for (const [i, [sid, category, title, description, priority, status, response]] of complaints.entries()) {
            const done = status === 'resolved' || status === 'closed';
            await db.query(
                `INSERT INTO complaints (student_id, room_id, category, title, description, priority, status, admin_response,
                    resolved_at, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW() - make_interval(days => ?))`,
                [studentIds[sid], roomOf[sid], category, title, description, priority, status, response,
                    done ? new Date(Date.now() - 864e5) : null, 12 - i]
            );
        }
    });

    log('Seeded demo data (admin: superadmin / admin123, student: STU2024001 / student123)');
    return true;
}

if (require.main === module) {
    seed()
        .then(() => pool.end())
        .catch((error) => {
            console.error('Seed failed:', error.message);
            process.exit(1);
        });
}

module.exports = { seed, academicYear };
