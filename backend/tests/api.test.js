const request = require('supertest');
const app = require('../server');
const { pool } = require('../config/database');

afterAll(() => pool.end());

const login = async (path, body) => {
    const res = await request(app).post(path).send(body);
    expect(res.status).toBe(200);
    return res.body.data.accessToken;
};

let adminToken;
let studentToken;

beforeAll(async () => {
    adminToken = await login('/api/admin/login', { username: 'superadmin', password: 'admin123' });
    studentToken = await login('/api/students/login', { studentId: 'STU2024001', password: 'student123' });
});

const asAdmin = (method, path) => request(app)[method](path).set('Authorization', `Bearer ${adminToken}`);
const asStudent = (method, path) => request(app)[method](path).set('Authorization', `Bearer ${studentToken}`);

describe('health', () => {
    test('GET /health checks the database', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok', db: 'ok' });
    });
});

describe('auth', () => {
    test('rejects a wrong password with 401', async () => {
        const res = await request(app).post('/api/admin/login').send({ username: 'superadmin', password: 'nope' });
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    test('validates the login body', async () => {
        const res = await request(app).post('/api/students/login').send({});
        expect(res.status).toBe(400);
        expect(res.body.errors.map((e) => e.field)).toEqual(expect.arrayContaining(['studentId', 'password']));
    });

    test('protected routes need a token and the right role', async () => {
        expect((await request(app).get('/api/admin/dashboard')).status).toBe(401);
        expect((await asStudent('get', '/api/admin/dashboard')).status).toBe(403);
    });

    test('unknown routes return JSON 404', async () => {
        const res = await request(app).get('/api/nope');
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });
});

describe('seeded demo data', () => {
    test('admin dashboard has stats and occupancy', async () => {
        const res = await asAdmin('get', '/api/admin/dashboard');
        expect(res.status).toBe(200);
        const { statistics, occupancyByBlock } = res.body.data;
        expect(statistics.totalStudents).toBe(46);
        expect(statistics.activeAllocations).toBe(39);
        expect(statistics.openComplaints).toBeGreaterThan(0);
        expect(typeof occupancyByBlock[0].occupancy_rate).toBe('number');
    });

    test('student sees their room, roommate and fees', async () => {
        const alloc = await asStudent('get', '/api/students/allocation');
        expect(alloc.body.data.allocation.room_number).toBe('201');
        expect(alloc.body.data.roommates).toHaveLength(1);
        const fees = await asStudent('get', '/api/students/payments');
        expect(fees.body.data.payments.length).toBeGreaterThan(1);
        expect(fees.body.data.summary.total_paid).toBeGreaterThan(0);
    });

    test('available rooms only include blocks for the student gender', async () => {
        const res = await asStudent('get', '/api/students/available-rooms');
        expect(res.status).toBe(200);
        expect(res.body.data.every((r) => ['male', 'mixed'].includes(r.gender_type))).toBe(true);
    });

    test('an allocated student cannot apply again', async () => {
        const res = await asStudent('post', '/api/students/applications').send({ preferredStartDate: '2099-01-01' });
        expect(res.status).toBe(409);
    });
});

describe('application to allocation flow', () => {
    test('register, apply, allocate, terminate', async () => {
        const reg = await request(app).post('/api/students/register').send({
            studentId: 'STU2099001', email: 'Test.User@Example.com', password: 'Passw0rd!', firstName: 'Test',
            lastName: 'User', gender: 'female', course: 'B.Sc Physics', yearOfStudy: 1
        });
        expect(reg.status).toBe(201);
        expect(reg.body.data.student.email).toBe('test.user@example.com');
        const token = reg.body.data.accessToken;
        const studentDbId = reg.body.data.student.id;

        const dup = await request(app).post('/api/students/register').send({
            studentId: 'STU2099001', email: 'other@example.com', password: 'Passw0rd!', firstName: 'Test',
            lastName: 'User', gender: 'female', course: 'B.Sc Physics', yearOfStudy: 1
        });
        expect(dup.status).toBe(409);

        const app1 = await request(app).post('/api/students/applications').set('Authorization', `Bearer ${token}`)
            .send({ preferredRoomType: 'double', preferredStartDate: '2099-01-01', durationMonths: 10 });
        expect(app1.status).toBe(201);

        const rooms = await asAdmin('get', '/api/admin/rooms?limit=100');
        const boysRoom = rooms.body.data.rooms.find((r) => r.gender_type === 'male' && r.available_beds > 0);
        const girlsRoom = rooms.body.data.rooms.find((r) => r.gender_type === 'female' && r.available_beds > 0 && r.room_status === 'available');

        const wrongBlock = await asAdmin('post', '/api/admin/allocations')
            .send({ studentId: studentDbId, roomId: boysRoom.id, startDate: '2099-01-01' });
        expect(wrongBlock.status).toBe(400);

        const alloc = await asAdmin('post', '/api/admin/allocations').send({
            studentId: studentDbId, roomId: girlsRoom.id, applicationId: app1.body.data.id, startDate: '2099-01-01'
        });
        expect(alloc.status).toBe(201);

        const room = await asAdmin('get', `/api/admin/rooms/${girlsRoom.id}`);
        expect(room.body.data.room.occupied_beds).toBe(girlsRoom.occupied_beds + 1);
        expect(room.body.data.occupants).toHaveLength(girlsRoom.occupied_beds + 1);

        const apps = await request(app).get('/api/students/applications').set('Authorization', `Bearer ${token}`);
        expect(apps.body.data.applications[0].status).toBe('approved');

        const pay = await asAdmin('post', '/api/admin/payments')
            .send({ allocationId: alloc.body.data.id, amount: 8000, paymentMethod: 'online', monthYear: '2099-01' });
        expect(pay.status).toBe(201);

        const term = await asAdmin('put', `/api/admin/allocations/${alloc.body.data.id}/terminate`).send({ reason: 'Test' });
        expect(term.status).toBe(200);
        const after = await asAdmin('get', `/api/admin/rooms/${girlsRoom.id}`);
        expect(after.body.data.room.occupied_beds).toBe(girlsRoom.occupied_beds);
    });

    test('partial room update keeps other fields and capacity cannot drop below occupancy', async () => {
        const rooms = await asAdmin('get', '/api/admin/rooms?limit=100');
        const full = rooms.body.data.rooms.find((r) => r.occupied_beds === 2);
        const res = await asAdmin('put', `/api/admin/rooms/${full.id}`).send({ facilities: 'WiFi only' });
        expect(res.status).toBe(200);
        expect(res.body.data.room_number).toBe(full.room_number);
        const shrink = await asAdmin('put', `/api/admin/rooms/${full.id}`).send({ capacity: 1 });
        expect(shrink.status).toBe(400);
    });
});

describe('complaints', () => {
    test('student raises a complaint and admin resolves it', async () => {
        const bad = await asStudent('post', '/api/students/complaints').send({ category: 'magic', title: 'x' });
        expect(bad.status).toBe(400);

        const created = await asStudent('post', '/api/students/complaints').send({
            category: 'plumbing', title: 'Shower is cold', description: 'No hot water since this morning.', priority: 'high'
        });
        expect(created.status).toBe(201);
        expect(created.body.data.room_id).not.toBeNull();

        const updated = await asAdmin('put', `/api/admin/complaints/${created.body.data.id}`)
            .send({ status: 'resolved', adminResponse: 'Geyser fixed' });
        expect(updated.status).toBe(200);
        expect(updated.body.data.resolved_at).not.toBeNull();

        const list = await asAdmin('get', '/api/admin/complaints?status=resolved');
        expect(list.body.data.complaints.some((c) => c.id === created.body.data.id)).toBe(true);
    });
});

describe('demo mode', () => {
    afterEach(() => {
        delete process.env.DEMO_MODE;
    });

    test('protects the shared demo student from lock-out', async () => {
        process.env.DEMO_MODE = 'true';
        const pw = await asStudent('put', '/api/students/change-password')
            .send({ currentPassword: 'student123', newPassword: 'NewPassw0rd' });
        expect(pw.status).toBe(403);
        const students = await asAdmin('get', '/api/admin/students?search=STU2024001');
        const demoId = students.body.data.students[0].id;
        expect((await asAdmin('delete', `/api/admin/students/${demoId}`)).status).toBe(403);
    });

    test('the public demo warden cannot delete data or create admins', async () => {
        process.env.DEMO_MODE = 'true';
        const blocks = await asAdmin('get', '/api/admin/blocks');
        expect(blocks.status).toBe(200);
        expect((await asAdmin('delete', '/api/admin/blocks/1')).status).toBe(403);
        expect((await asAdmin('delete', '/api/admin/rooms/1')).status).toBe(403);
        const admin = await asAdmin('post', '/api/admin/create')
            .send({ username: 'intruder', password: 'Passw0rd!x', email: 'x@hostel.edu', fullName: 'X' });
        expect(admin.status).toBe(403);
        expect((await asAdmin('get', '/api/admin/blocks')).body).toEqual(blocks.body);
    });

    test('change-password validates the new password', async () => {
        const res = await asStudent('put', '/api/students/change-password').send({ currentPassword: 'x', newPassword: 'short' });
        expect(res.status).toBe(400);
    });
});
