/**
 * Database Configuration Module
 * Handles MySQL connection pool configuration and database operations
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration from environment variables
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hostel_db',
    port: process.env.DB_PORT || 3306,
    
    // Connection pool settings
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    
    // Timeout settings
    connectTimeout: 10000,
    acquireTimeout: 10000,
    
    // Enable prepared statements
    namedPlaceholders: true,
    
    // Date handling
    dateStrings: true,
    
    // Debug mode (set to true for development)
    debug: process.env.DB_DEBUG === 'true'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

/**
 * Test database connection
 * @returns {Promise<boolean>} - Returns true if connection is successful
 */
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connection established successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

/**
 * Execute a SQL query with parameters
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} - Query results
 */
const query = async (sql, params = []) => {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Query Error:', error.message);
        throw error;
    }
};

/**
 * Execute a transaction with multiple queries
 * @param {Function} callback - Async function containing transaction queries
 * @returns {Promise<any>} - Transaction results
 */
const transaction = async (callback) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        console.error('Transaction Error:', error.message);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Get a single connection from the pool
 * @returns {Promise<Object>} - Database connection
 */
const getConnection = async () => {
    return await pool.getConnection();
};

/**
 * Close all connections in the pool
 * @returns {Promise<void>}
 */
const closePool = async () => {
    await pool.end();
    console.log('Database pool closed');
};

// Handle process termination
process.on('SIGINT', async () => {
    await closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closePool();
    process.exit(0);
});

module.exports = {
    pool,
    query,
    transaction,
    getConnection,
    testConnection,
    closePool,
    dbConfig
};