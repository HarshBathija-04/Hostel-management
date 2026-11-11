-- Hostel Room Allotment System - initial Postgres schema.
-- Ported from the original MySQL schema. ENUMs become CHECK constraints; ON UPDATE
-- timestamps and the bed-count triggers become plpgsql triggers.
-- The runner sets search_path to DB_SCHEMA, so every object lands in the app's schema.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE admin (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    phone VARCHAR(20),
    address TEXT,
    course VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    year_of_study INT NOT NULL,
    enrollment_date DATE,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    profile_image VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

CREATE TABLE hostel_blocks (
    id SERIAL PRIMARY KEY,
    block_name VARCHAR(50) NOT NULL UNIQUE,
    block_code VARCHAR(10) NOT NULL UNIQUE,
    gender_type VARCHAR(10) NOT NULL CHECK (gender_type IN ('male', 'female', 'mixed')),
    description TEXT,
    total_floors INT NOT NULL DEFAULT 1,
    warden_name VARCHAR(100),
    warden_contact VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL,
    block_id INT NOT NULL REFERENCES hostel_blocks(id) ON DELETE CASCADE,
    floor_number INT NOT NULL DEFAULT 1,
    room_type VARCHAR(10) NOT NULL DEFAULT 'double' CHECK (room_type IN ('single', 'double', 'triple', 'quad')),
    capacity INT NOT NULL DEFAULT 2 CHECK (capacity > 0),
    occupied_beds INT NOT NULL DEFAULT 0,
    available_beds INT GENERATED ALWAYS AS (capacity - occupied_beds) STORED,
    room_status VARCHAR(15) NOT NULL DEFAULT 'available' CHECK (room_status IN ('available', 'full', 'maintenance', 'reserved')),
    facilities TEXT,
    monthly_rent NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Guards the last bed against two concurrent allocations.
    CONSTRAINT rooms_beds_in_range CHECK (occupied_beds BETWEEN 0 AND capacity),
    CONSTRAINT unique_room_block UNIQUE (room_number, block_id)
);

CREATE TABLE room_applications (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    preferred_block_id INT REFERENCES hostel_blocks(id) ON DELETE SET NULL,
    preferred_room_type VARCHAR(10) NOT NULL DEFAULT 'any' CHECK (preferred_room_type IN ('single', 'double', 'triple', 'quad', 'any')),
    application_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    preferred_start_date DATE,
    duration_months INT NOT NULL DEFAULT 12,
    special_requirements TEXT,
    status VARCHAR(15) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlisted', 'cancelled')),
    admin_remarks TEXT,
    processed_by INT REFERENCES admin(id) ON DELETE SET NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE room_allocations (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    application_id INT REFERENCES room_applications(id) ON DELETE SET NULL,
    bed_number INT NOT NULL DEFAULT 1,
    allocation_date DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    rent_amount NUMERIC(10, 2) NOT NULL,
    security_deposit NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
    allocation_status VARCHAR(12) NOT NULL DEFAULT 'active' CHECK (allocation_status IN ('active', 'expired', 'terminated', 'extended')),
    termination_reason TEXT,
    allocated_by INT NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- MySQL had UNIQUE(student_id, allocation_status), which blocked a second terminated stay.
-- The intended rule is "one active allocation per student".
CREATE UNIQUE INDEX unique_student_active ON room_allocations(student_id) WHERE allocation_status = 'active';

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    allocation_id INT NOT NULL REFERENCES room_allocations(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_type VARCHAR(20) NOT NULL DEFAULT 'rent' CHECK (payment_type IN ('rent', 'security_deposit', 'fine', 'other')),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'online')),
    transaction_id VARCHAR(100),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    month_year VARCHAR(10),
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    remarks TEXT,
    recorded_by INT REFERENCES admin(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('student', 'admin')),
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INT,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rooms_block ON rooms(block_id);
CREATE INDEX idx_rooms_status ON rooms(room_status);
CREATE INDEX idx_allocations_student ON room_allocations(student_id);
CREATE INDEX idx_allocations_room ON room_allocations(room_id);
CREATE INDEX idx_allocations_status ON room_allocations(allocation_status);
CREATE INDEX idx_applications_student ON room_applications(student_id);
CREATE INDEX idx_applications_status ON room_applications(status);
CREATE INDEX idx_payments_allocation ON payments(allocation_id);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_type, user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

CREATE TRIGGER trg_admin_updated BEFORE UPDATE ON admin FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_students_updated BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_blocks_updated BEFORE UPDATE ON hostel_blocks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rooms_updated BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON room_applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_allocations_updated BEFORE UPDATE ON room_allocations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Keep rooms.occupied_beds / room_status in step with active allocations.
CREATE OR REPLACE FUNCTION sync_room_occupancy() RETURNS trigger AS $$
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.allocation_status = 'active' THEN
        IF TG_OP = 'DELETE' OR NEW.allocation_status <> 'active' OR NEW.room_id <> OLD.room_id THEN
            UPDATE rooms
               SET occupied_beds = GREATEST(occupied_beds - 1, 0),
                   room_status = CASE WHEN room_status = 'full' THEN 'available' ELSE room_status END
             WHERE id = OLD.room_id;
        END IF;
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.allocation_status = 'active' THEN
        IF TG_OP = 'INSERT' OR OLD.allocation_status <> 'active' OR NEW.room_id <> OLD.room_id THEN
            UPDATE rooms
               SET occupied_beds = occupied_beds + 1,
                   room_status = CASE WHEN occupied_beds + 1 >= capacity THEN 'full' ELSE room_status END
             WHERE id = NEW.room_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_allocation_occupancy
AFTER INSERT OR UPDATE OR DELETE ON room_allocations
FOR EACH ROW EXECUTE FUNCTION sync_room_occupancy();

CREATE OR REPLACE VIEW v_room_availability AS
SELECT hb.block_name, hb.block_code, hb.gender_type,
       COUNT(r.id) AS total_rooms,
       COALESCE(SUM(r.capacity), 0) AS total_capacity,
       COALESCE(SUM(r.occupied_beds), 0) AS total_occupied,
       COALESCE(SUM(r.available_beds), 0) AS total_available,
       COUNT(*) FILTER (WHERE r.room_status = 'available') AS available_rooms,
       COUNT(*) FILTER (WHERE r.room_status = 'full') AS full_rooms,
       COUNT(*) FILTER (WHERE r.room_status = 'maintenance') AS maintenance_rooms
  FROM hostel_blocks hb
  LEFT JOIN rooms r ON hb.id = r.block_id AND r.is_active
 WHERE hb.is_active
 GROUP BY hb.id, hb.block_name, hb.block_code, hb.gender_type;

CREATE OR REPLACE VIEW v_pending_applications AS
SELECT ra.id AS application_id, s.student_id,
       s.first_name || ' ' || s.last_name AS student_name,
       s.email, s.phone, s.course, s.year_of_study, s.gender,
       ra.application_date, ra.preferred_start_date, ra.preferred_room_type,
       hb.block_name AS preferred_block, ra.special_requirements, ra.status, ra.admin_remarks,
       CURRENT_DATE - ra.application_date::date AS days_pending
  FROM room_applications ra
  JOIN students s ON ra.student_id = s.id
  LEFT JOIN hostel_blocks hb ON ra.preferred_block_id = hb.id
 WHERE ra.status = 'pending';
