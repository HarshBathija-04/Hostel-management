-- =====================================================
-- Hostel Room Allotment System - Test Data
-- =====================================================
-- This script inserts sample data for testing the system
-- Run this after schema.sql
-- =====================================================

USE hostel_db;

-- =====================================================
-- Insert Admin Users
-- Password: admin123 (hashed with bcrypt - 10 rounds)
-- Hash: $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- =====================================================
INSERT INTO admin (username, password, email, full_name, phone, role, is_active) VALUES
('superadmin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'superadmin@hostel.edu', 'Super Administrator', '9876543210', 'super_admin', TRUE),
('admin1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin1@hostel.edu', 'John Smith', '9876543211', 'admin', TRUE),
('admin2', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin2@hostel.edu', 'Sarah Johnson', '9876543212', 'admin', TRUE);

-- =====================================================
-- Insert Hostel Blocks
-- =====================================================
INSERT INTO hostel_blocks (block_name, block_code, gender_type, description, total_floors, warden_name, warden_contact, is_active) VALUES
('Boys Block A', 'BBA', 'male', 'Primary boys hostel block with modern facilities', 4, 'Mr. Robert Brown', '9876543220', TRUE),
('Boys Block B', 'BBB', 'male', 'Secondary boys hostel block', 3, 'Mr. David Wilson', '9876543221', TRUE),
('Girls Block A', 'GBA', 'female', 'Primary girls hostel block with enhanced security', 4, 'Mrs. Emily Davis', '9876543222', TRUE),
('Girls Block B', 'GBB', 'female', 'Secondary girls hostel block', 3, 'Ms. Jennifer Lee', '9876543223', TRUE),
('International Block', 'INT', 'mixed', 'Block for international students', 2, 'Dr. Michael Chen', '9876543224', TRUE);

-- =====================================================
-- Insert Rooms
-- =====================================================
-- Boys Block A Rooms (Block ID: 1)
INSERT INTO rooms (room_number, block_id, floor_number, room_type, capacity, occupied_beds, room_status, facilities, monthly_rent, is_active) VALUES
('101', 1, 1, 'double', 2, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe', 8000.00, TRUE),
('102', 1, 1, 'double', 2, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe', 8000.00, TRUE),
('103', 1, 1, 'triple', 3, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe', 6000.00, TRUE),
('104', 1, 1, 'single', 1, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe, Mini Fridge', 12000.00, TRUE),
('201', 1, 2, 'double', 2, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe', 8000.00, TRUE),
('202', 1, 2, 'double', 2, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe', 8000.00, TRUE),
('203', 1, 2, 'triple', 3, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe', 6000.00, TRUE),
('301', 1, 3, 'double', 2, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe', 8000.00, TRUE),
('302', 1, 3, 'double', 2, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe', 8000.00, TRUE),
('401', 1, 4, 'quad', 4, 0, 'available', 'WiFi, AC, Common Bathroom, Study Table, Wardrobe', 5000.00, TRUE);

-- Boys Block B Rooms (Block ID: 2)
INSERT INTO rooms (room_number, block_id, floor_number, room_type, capacity, occupied_beds, room_status, facilities, monthly_rent, is_active) VALUES
('101', 2, 1, 'double', 2, 0, 'available', 'WiFi, Fan, Common Bathroom, Study Table, Wardrobe', 5000.00, TRUE),
('102', 2, 1, 'double', 2, 0, 'available', 'WiFi, Fan, Common Bathroom, Study Table, Wardrobe', 5000.00, TRUE),
('103', 2, 1, 'triple', 3, 0, 'available', 'WiFi, Fan, Common Bathroom, Study Table, Wardrobe', 4000.00, TRUE),
('201', 2, 2, 'double', 2, 0, 'available', 'WiFi, Fan, Common Bathroom, Study Table, Wardrobe', 5000.00, TRUE),
('202', 2, 2, 'double', 2, 0, 'available', 'WiFi, Fan, Common Bathroom, Study Table, Wardrobe', 5000.00, TRUE),
('301', 2, 3, 'double', 2, 0, 'available', 'WiFi, Fan, Common Bathroom, Study Table, Wardrobe', 5000.00, TRUE);

-- Girls Block A Rooms (Block ID: 3)
INSERT INTO rooms (room_number, block_id, floor_number, room_type, capacity, occupied_beds, room_status, facilities, monthly_rent, is_active) VALUES
('101', 3, 1, 'double', 2, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe', 8000.00, TRUE),
('102', 3, 1, 'double', 2, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe', 8000.00, TRUE),
('103', 3, 1, 'single', 1, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe, Mini Fridge', 12000.00, TRUE),
('201', 3, 2, 'double', 2, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe', 8000.00, TRUE),
('202', 3, 2, 'double', 2, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe', 8000.00, TRUE),
('203', 3, 2, 'triple', 3, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe', 6000.00, TRUE),
('301', 3, 3, 'double', 2, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe', 8000.00, TRUE),
('302', 3, 3, 'double', 2, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe', 8000.00, TRUE);

-- Girls Block B Rooms (Block ID: 4)
INSERT INTO rooms (room_number, block_id, floor_number, room_type, capacity, occupied_beds, room_status, facilities, monthly_rent, is_active) VALUES
('101', 4, 1, 'double', 2, 0, 'available', 'WiFi, Fan, Common Bathroom, Study Table, Wardrobe', 5000.00, TRUE),
('102', 4, 1, 'double', 2, 0, 'available', 'WiFi, Fan, Common Bathroom, Study Table, Wardrobe', 5000.00, TRUE),
('201', 4, 2, 'double', 2, 0, 'available', 'WiFi, Fan, Common Bathroom, Study Table, Wardrobe', 5000.00, TRUE),
('202', 4, 2, 'triple', 3, 0, 'available', 'WiFi, Fan, Common Bathroom, Study Table, Wardrobe', 4000.00, TRUE),
('301', 4, 3, 'double', 2, 0, 'available', 'WiFi, Fan, Common Bathroom, Study Table, Wardrobe', 5000.00, TRUE);

-- International Block Rooms (Block ID: 5)
INSERT INTO rooms (room_number, block_id, floor_number, room_type, capacity, occupied_beds, room_status, facilities, monthly_rent, is_active) VALUES
('101', 5, 1, 'single', 1, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe, Mini Fridge, Kitchenette', 15000.00, TRUE),
('102', 5, 1, 'single', 1, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe, Mini Fridge, Kitchenette', 15000.00, TRUE),
('103', 5, 1, 'double', 2, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe, Mini Fridge', 10000.00, TRUE),
('201', 5, 2, 'single', 1, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe, Mini Fridge, Kitchenette', 15000.00, TRUE),
('202', 5, 2, 'double', 2, 0, 'available', 'WiFi, AC, Attached Bathroom, Study Table, Wardrobe, Mini Fridge', 10000.00, TRUE);

-- =====================================================
-- Insert Sample Students
-- Password for all: student123 (hashed with bcrypt - 10 rounds)
-- Hash: $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- =====================================================
INSERT INTO students (student_id, password, email, first_name, last_name, date_of_birth, gender, phone, address, course, department, year_of_study, enrollment_date, emergency_contact_name, emergency_contact_phone, is_active, email_verified) VALUES
('STU2024001', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student1@university.edu', 'Alice', 'Johnson', '2002-03-15', 'female', '9876543230', '123 Main St, City', 'Computer Science', 'Engineering', 2, '2023-08-01', 'Robert Johnson', '9876543240', TRUE, TRUE),
('STU2024002', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student2@university.edu', 'Bob', 'Smith', '2001-07-22', 'male', '9876543231', '456 Oak Ave, City', 'Electrical Engineering', 'Engineering', 3, '2022-08-01', 'Mary Smith', '9876543241', TRUE, TRUE),
('STU2024003', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student3@university.edu', 'Carol', 'Williams', '2003-01-10', 'female', '9876543232', '789 Pine Rd, City', 'Business Administration', 'Management', 1, '2024-08-01', 'David Williams', '9876543242', TRUE, TRUE),
('STU2024004', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student4@university.edu', 'David', 'Brown', '2002-11-05', 'male', '9876543233', '321 Elm St, City', 'Mechanical Engineering', 'Engineering', 2, '2023-08-01', 'Susan Brown', '9876543243', TRUE, TRUE),
('STU2024005', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student5@university.edu', 'Emma', 'Davis', '2001-05-18', 'female', '9876543234', '654 Maple Dr, City', 'Psychology', 'Social Sciences', 4, '2021-08-01', 'Michael Davis', '9876543244', TRUE, TRUE),
('STU2024006', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student6@university.edu', 'Frank', 'Miller', '2003-09-30', 'male', '9876543235', '987 Cedar Ln, City', 'Civil Engineering', 'Engineering', 1, '2024-08-01', 'Patricia Miller', '9876543245', TRUE, TRUE),
('STU2024007', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student7@university.edu', 'Grace', 'Wilson', '2002-12-12', 'female', '9876543236', '147 Birch St, City', 'Medicine', 'Health Sciences', 2, '2023-08-01', 'Thomas Wilson', '9876543246', TRUE, TRUE),
('STU2024008', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student8@university.edu', 'Henry', 'Moore', '2001-04-25', 'male', '9876543237', '258 Spruce Ave, City', 'Physics', 'Science', 3, '2022-08-01', 'Linda Moore', '9876543247', TRUE, TRUE),
('STU2024009', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student9@university.edu', 'Ivy', 'Taylor', '2003-06-08', 'female', '9876543238', '369 Willow Rd, City', 'Chemistry', 'Science', 1, '2024-08-01', 'James Taylor', '9876543248', TRUE, TRUE),
('STU2024010', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student10@university.edu', 'Jack', 'Anderson', '2002-08-20', 'male', '9876543239', '159 Ash St, City', 'Mathematics', 'Science', 2, '2023-08-01', 'Barbara Anderson', '9876543249', TRUE, TRUE);

-- =====================================================
-- Insert Sample Room Applications
-- =====================================================
INSERT INTO room_applications (student_id, preferred_block_id, preferred_room_type, preferred_start_date, duration_months, special_requirements, status, admin_remarks, processed_by, processed_at) VALUES
(1, 3, 'double', '2024-09-01', 12, 'I prefer a quiet room on a higher floor', 'pending', NULL, NULL, NULL),
(2, 1, 'double', '2024-09-01', 12, 'Need room close to the common room', 'pending', NULL, NULL, NULL),
(3, 4, 'any', '2024-09-01', 12, 'First-time hostel student', 'pending', NULL, NULL, NULL),
(4, 1, 'triple', '2024-09-01', 12, 'Budget constraint, prefer shared room', 'approved', 'Approved for Block A, Room 103', 1, NOW()),
(5, 3, 'single', '2024-09-01', 12, 'Need single room for focused study', 'pending', NULL, NULL, NULL),
(6, 2, 'double', '2024-09-01', 12, 'No special requirements', 'pending', NULL, NULL, NULL),
(7, 3, 'double', '2024-09-01', 12, 'Prefer room with AC', 'approved', 'Approved for Girls Block A, Room 101', 1, NOW()),
(8, 1, 'double', '2024-09-01', 12, 'Need good WiFi for online classes', 'pending', NULL, NULL, NULL),
(9, 4, 'double', '2024-09-01', 12, 'First year student', 'pending', NULL, NULL, NULL),
(10, 2, 'double', '2024-09-01', 12, 'Prefer lower floor room', 'rejected', 'No vacancies in preferred block', 1, NOW());

-- =====================================================
-- Insert Sample Room Allocations
-- =====================================================
INSERT INTO room_allocations (student_id, room_id, application_id, bed_number, allocation_date, start_date, end_date, rent_amount, security_deposit, payment_status, allocation_status, allocated_by) VALUES
(4, 3, 4, 1, '2024-08-15', '2024-09-01', '2025-08-31', 6000.00, 12000.00, 'paid', 'active', 1),
(7, 10, 7, 1, '2024-08-15', '2024-09-01', '2025-08-31', 8000.00, 16000.00, 'paid', 'active', 1);

-- =====================================================
-- Insert Sample Payments
-- =====================================================
INSERT INTO payments (allocation_id, student_id, amount, payment_type, payment_method, transaction_id, payment_date, month_year, status, remarks, recorded_by) VALUES
(1, 4, 12000.00, 'security_deposit', 'online', 'TXN202408150001', '2024-08-15 10:30:00', NULL, 'completed', 'Security deposit for room allocation', 1),
(1, 4, 6000.00, 'rent', 'online', 'TXN202408150002', '2024-08-15 10:35:00', '2024-09', 'completed', 'Rent for September 2024', 1),
(2, 7, 16000.00, 'security_deposit', 'bank_transfer', 'TXN202408150003', '2024-08-15 14:20:00', NULL, 'completed', 'Security deposit for room allocation', 1),
(2, 7, 8000.00, 'rent', 'bank_transfer', 'TXN202408150004', '2024-08-15 14:25:00', '2024-09', 'completed', 'Rent for September 2024', 1);

-- =====================================================
-- Update room occupied beds for allocated rooms
-- =====================================================
UPDATE rooms SET occupied_beds = 1, room_status = 'available' WHERE id = 3;
UPDATE rooms SET occupied_beds = 1, room_status = 'available' WHERE id = 10;

-- =====================================================
-- End of Test Data
-- =====================================================

-- Verify data insertion
SELECT 'Admin Users' as table_name, COUNT(*) as record_count FROM admin
UNION ALL
SELECT 'Hostel Blocks', COUNT(*) FROM hostel_blocks
UNION ALL
SELECT 'Rooms', COUNT(*) FROM rooms
UNION ALL
SELECT 'Students', COUNT(*) FROM students
UNION ALL
SELECT 'Room Applications', COUNT(*) FROM room_applications
UNION ALL
SELECT 'Room Allocations', COUNT(*) FROM room_allocations
UNION ALL
SELECT 'Payments', COUNT(*) FROM payments;