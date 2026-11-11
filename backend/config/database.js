/**
 * Postgres connection pool. Connects only via DATABASE_URL and pins search_path to DB_SCHEMA,
 * because all portfolio apps share one Render Postgres database, one schema per app.
 */
const { Pool, types } = require('pg');
require('dotenv').config();

// COUNT()/SUM() come back as int8/numeric strings; the API has always returned numbers.
types.setTypeParser(20, (v) => parseInt(v, 10));
types.setTypeParser(1700, (v) => parseFloat(v));
// Keep DATE as 'YYYY-MM-DD' instead of a timezone-shifted JS Date.
types.setTypeParser(1082, (v) => v);

const schema = process.env.DB_SCHEMA || 'hostel_management';
if (!/^[a-z_][a-z0-9_]*$/i.test(schema)) {
    throw new Error(`Invalid DB_SCHEMA "${schema}"`);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Render's internal URL needs no TLS; set DATABASE_SSL=true when using the external URL.
    ssl: process.env.DATABASE_SSL === 'true' ? true : undefined,
    options: `-c search_path=${schema}`,
    max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
});

pool.on('error', (err) => console.error('Idle Postgres client error:', err.message));

// The controllers were written for mysql2 '?' placeholders; translate them to $1, $2, ...
const toPg = (sql) => {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
};

/** Run a parameterized query and return its rows. */
const query = async (sql, params = []) => (await pool.query(toPg(sql), params)).rows;

/** Run callback({ query }) inside BEGIN/COMMIT, rolling back on any error. */
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback({
            query: async (sql, params = []) => (await client.query(toPg(sql), params)).rows
        });
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/** True when the database answers SELECT 1. */
const ping = async () => {
    try {
        await pool.query('SELECT 1');
        return true;
    } catch (error) {
        console.error('Database ping failed:', error.message);
        return false;
    }
};

module.exports = { pool, schema, query, transaction, ping, toPg };
