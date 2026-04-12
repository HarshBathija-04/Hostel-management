-- =====================================================
-- Hostel Room Allotment System - Database Schema
-- =====================================================
-- Database: hostel_db
-- Description: Complete schema for hostel management system
-- =====================================================

-- Create Database
CREATE DATABASE IF NOT EXISTS hostel_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hostel_db;

-- =====================================================
-- Table: admin
-- Description: Stores administrator credentials and details
-- =====================================================
DROP TABLE IF EXISTS admin;
CREATE TABLE admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('super_admin', 'admin') DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Table: students
-- Description: Stores student registration and profile information
-- =====================================================
DROP TABLE IF EXISTS students;
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other') NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    course VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    year_of_study INT NOT NULL,
    enrollment_date DATE,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    profile_image VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Table: hostel_blocks
-- Description: Stores hostel block information
-- =====================================================
DROP TABLE IF EXISTS hostel_blocks;
CREATE TABLE hostel_blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    block_name VARCHAR(50) NOT NULL UNIQUE,
    block_code VARCHAR(10) NOT NULL UNIQUE,
    gender_type ENUM('male', 'female', 'mixed') NOT NULL,
    description TEXT,
    total_floors INT DEFAULT 1,
    warden_name VARCHAR(100),
    warden_contact VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Table: rooms
-- Description: Stores room details and capacity
-- =====================================================
DROP TABLE IF EXISTS rooms;
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL,
    block_id INT NOT NULL,
    floor_number INT DEFAULT 1,
    room_type ENUM('single', 'double', 'triple', 'quad') DEFAULT 'double',
    capacity INT NOT NULL DEFAULT 2,
    occupied_beds INT DEFAULT 0,
    available_beds INT GENERATED ALWAYS AS (capacity - occupied_beds) STORED,
    room_status ENUM('available', 'full', 'maintenance', 'reserved') DEFAULT 'available',
    facilities TEXT,
    monthly_rent DECIMAL(10, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id) REFERENCES hostel_blocks(id) ON DELETE CASCADE,
    UNIQUE KEY unique_room_block (room_number, block_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Table: room_applications
-- Description: Stores student applications for hostel accommodation
-- =====================================================
DROP TABLE IF EXISTS room_applications;
CREATE TABLE room_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    preferred_block_id INT,
    preferred_room_type ENUM('single', 'double', 'triple', 'quad', 'any') DEFAULT 'any',
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    preferred_start_date DATE,
    duration_months INT DEFAULT 12,
    special_requirements TEXT,
    status ENUM('pending', 'approved', 'rejected', 'waitlisted', 'cancelled') DEFAULT 'pending',
    admin_remarks TEXT,
    processed_by INT,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (preferred_block_id) REFERENCES hostel_blocks(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES admin(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Table: room_allocations
-- Description: Stores room allotment details for students
-- =====================================================
DROP TABLE IF EXISTS room_allocations;
CREATE TABLE room_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    room_id INT NOT NULL,
    application_id INT,
    bed_number INT DEFAULT 1,
    allocation_date DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    rent_amount DECIMAL(10, 2) NOT NULL,
    security_deposit DECIMAL(10, 2) DEFAULT 0.00,
    payment_status ENUM('pending', 'partial', 'paid', 'refunded') DEFAULT 'pending',
    allocation_status ENUM('active', 'expired', 'terminated', 'extended') DEFAULT 'active',
    termination_reason TEXT,
    allocated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES room_applications(id) ON DELETE SET NULL,
    FOREIGN KEY (allocated_by) REFERENCES admin(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_active (student_id, allocation_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Table: payments
-- Description: Stores payment records for room allocations
-- =====================================================
DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    allocation_id INT NOT NULL,
    student_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_type ENUM('rent', 'security_deposit', 'fine', 'other') DEFAULT 'rent',
    payment_method ENUM('cash', 'card', 'bank_transfer', 'online') NOT NULL,
    transaction_id VARCHAR(100),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    month_year VARCHAR(10),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    remarks TEXT,
    recorded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (allocation_id) REFERENCES room_allocations(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES admin(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Table: audit_logs
-- Description: Stores system activity logs for security
-- =====================================================
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_type ENUM('student', 'admin') NOT NULL,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Indexes for better performance
-- =====================================================
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_rooms_block ON rooms(block_id);
CREATE INDEX idx_rooms_status ON rooms(room_status);
CREATE INDEX idx_allocations_student ON room_allocations(student_id);
CREATE INDEX idx_allocations_room ON room_allocations(room_id);
CREATE INDEX idx_allocations_status ON room_allocations(allocation_status);
CREATE INDEX idx_applications_student ON room_applications(student_id);
CREATE INDEX idx_applications_status ON room_applications(status);
CREATE INDEX idx_payments_allocation ON payments(allocation_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_type, user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- =====================================================
-- Views for common queries
-- =====================================================

-- View: Room Availability Summary
CREATE OR REPLACE VIEW v_room_availability AS
SELECT 
    hb.block_name,
    hb.block_code,
    hb.gender_type,
    COUNT(r.id) as total_rooms,
    SUM(r.capacity) as total_capacity,
    SUM(r.occupied_beds) as total_occupied,
    SUM(r.available_beds) as total_available,
    COUNT(CASE WHEN r.room_status = 'available' THEN 1 END) as available_rooms,
    COUNT(CASE WHEN r.room_status = 'full' THEN 1 END) as full_rooms,
    COUNT(CASE WHEN r.room_status = 'maintenance' THEN 1 END) as maintenance_rooms
FROM hostel_blocks hb
LEFT JOIN rooms r ON hb.id = r.block_id AND r.is_active = TRUE
WHERE hb.is_active = TRUE
GROUP BY hb.id, hb.block_name, hb.block_code, hb.gender_type;

-- View: Student Allocation Details
CREATE OR REPLACE VIEW v_student_allocations AS
SELECT 
    s.id as student_id,
    s.student_id as student_code,
    CONCAT(s.first_name, ' ', s.last_name) as student_name,
    s.email,
    s.course,
    s.year_of_study,
    s.gender,
    r.room_number,
    hb.block_name,
    hb.block_code,
    ra.bed_number,
    ra.allocation_date,
    ra.start_date,
    ra.end_date,
    ra.rent_amount,
    ra.payment_status,
    ra.allocation_status
FROM students s
LEFT JOIN room_allocations ra ON s.id = ra.student_id AND ra.allocation_status = 'active'
LEFT JOIN rooms r ON ra.room_id = r.id
LEFT JOIN hostel_blocks hb ON r.block_id = hb.id;

-- View: Pending Applications with Student Details
CREATE OR REPLACE VIEW v_pending_applications AS
SELECT 
    ra.id as application_id,
    s.student_id,
    CONCAT(s.first_name, ' ', s.last_name) as student_name,
    s.email,
    s.phone,
    s.course,
    s.year_of_study,
    s.gender,
    ra.application_date,
    ra.preferred_start_date,
    ra.preferred_room_type,
    hb.block_name as preferred_block,
    ra.special_requirements,
    ra.status,
    ra.admin_remarks,
    DATEDIFF(CURRENT_DATE, ra.application_date) as days_pending
FROM room_applications ra
JOIN students s ON ra.student_id = s.id
LEFT JOIN hostel_blocks hb ON ra.preferred_block_id = hb.id
WHERE ra.status = 'pending'
ORDER BY ra.application_date ASC;

-- =====================================================
-- Triggers for automatic updates
-- =====================================================

DELIMITER //

-- Trigger: Update room occupied beds after allocation
CREATE TRIGGER trg_after_allocation_insert
AFTER INSERT ON room_allocations
FOR EACH ROW
BEGIN
    IF NEW.allocation_status = 'active' THEN
        UPDATE rooms 
        SET occupied_beds = occupied_beds + 1,
            room_status = CASE 
                WHEN occupied_beds + 1 >= capacity THEN 'full' 
                ELSE 'available' 
            END
        WHERE id = NEW.room_id;
    END IF;
END//

-- Trigger: Update room occupied beds after allocation update
CREATE TRIGGER trg_after_allocation_update
AFTER UPDATE ON room_allocations
FOR EACH ROW
BEGIN
    IF OLD.allocation_status = 'active' AND NEW.allocation_status != 'active' THEN
        UPDATE rooms 
        SET occupied_beds = GREATEST(occupied_beds - 1, 0),
            room_status = 'available'
        WHERE id = OLD.room_id;
    ELSEIF OLD.allocation_status != 'active' AND NEW.allocation_status = 'active' THEN
        UPDATE rooms 
        SET occupied_beds = occupied_beds + 1,
            room_status = CASE 
                WHEN occupied_beds + 1 >= capacity THEN 'full' 
                ELSE 'available' 
            END
        WHERE id = NEW.room_id;
    END IF;
END//

-- Trigger: Update room occupied beds after allocation delete
CREATE TRIGGER trg_after_allocation_delete
AFTER DELETE ON room_allocations
FOR EACH ROW
BEGIN
    IF OLD.allocation_status = 'active' THEN
        UPDATE rooms 
        SET occupied_beds = GREATEST(occupied_beds - 1, 0),
            room_status = 'available'
        WHERE id = OLD.room_id;
    END IF;
END//

DELIMITER ;

-- =====================================================
-- End of Schema
-- =====================================================