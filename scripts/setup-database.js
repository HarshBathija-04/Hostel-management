/**
 * Local database setup: creates DB_SCHEMA, applies migrations and loads demo data.
 * Reads backend/.env (copy backend/.env.example first). Usage: npm run setup:db
 */
const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, '..', 'backend');
if (!fs.existsSync(path.join(backendDir, '.env'))) {
    console.error('backend/.env not found. Copy backend/.env.example to backend/.env and set DATABASE_URL.');
    process.exit(1);
}
process.chdir(backendDir); // dotenv in config/database.js loads ./.env

const { pool } = require('../backend/config/database');
const { migrate } = require('../backend/db/migrate');
const { seed } = require('../backend/db/seed');

migrate()
    .then(() => seed())
    .then(() => pool.end())
    .catch((error) => {
        console.error('Database setup failed:', error.message);
        process.exit(1);
    });
