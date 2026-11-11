/**
 * Applies db/migrations/*.sql in filename order, once each, inside DB_SCHEMA.
 * Usage: node db/migrate.js
 */
const fs = require('fs');
const path = require('path');
const { pool, schema } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function migrate({ log = console.log } = {}) {
    const client = await pool.connect();
    try {
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
        // Serialize concurrent deploys/test runs against the same schema.
        await client.query('SELECT pg_advisory_lock(hashtext($1))', [schema]);
        await client.query(
            'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())'
        );
        const { rows } = await client.query('SELECT name FROM schema_migrations');
        const applied = new Set(rows.map((r) => r.name));
        const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

        for (const file of files) {
            if (applied.has(file)) continue;
            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
                await client.query('COMMIT');
                log(`Applied migration ${file}`);
            } catch (error) {
                await client.query('ROLLBACK');
                throw new Error(`Migration ${file} failed: ${error.message}`, { cause: error });
            }
        }
        log(`Schema "${schema}" is up to date`);
    } finally {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [schema]).catch(() => {});
        client.release();
    }
}

if (require.main === module) {
    migrate()
        .then(() => pool.end())
        .catch((error) => {
            console.error(error.message);
            process.exit(1);
        });
}

module.exports = { migrate };
