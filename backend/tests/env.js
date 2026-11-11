// Test env: isolated schema so tests never touch the dev/demo data.
process.env.NODE_ENV = 'test';
process.env.DB_SCHEMA = process.env.TEST_DB_SCHEMA || 'hostel_management_test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/portfolio';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.BCRYPT_ROUNDS = '4';
