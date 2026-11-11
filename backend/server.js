/**
 * Hostel Room Allotment System - JSON API (Express + Postgres).
 * `node server.js` starts the server; requiring this file only builds the app (used by tests).
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { ping, pool } = require('./config/database');
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
}

const app = express();
app.disable('x-powered-by');
// Render terminates TLS in front of the app; trust it so rate limiting sees real client IPs.
app.set('trust proxy', 1);

app.use(helmet());

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5212')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400
}));

const limiter = (max, message) => rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTest,
    message: { success: false, message }
});

app.use('/api/', limiter(parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 300, 'Too many requests, please try again later.'));
const authLimiter = limiter(20, 'Too many attempts, please try again in 15 minutes.');
app.use(['/api/students/login', '/api/students/register', '/api/admin/login'], authLimiter);

if (!isTest) {
    app.use(morgan(isProd ? 'combined' : 'dev'));
}

app.use(express.json({ limit: '100kb' }));

// Keep-alive and Render health check: also exercises the DB connection.
const health = async (req, res) => {
    const dbOk = await ping();
    res.status(dbOk ? 200 : 503).json({ status: dbOk ? 'ok' : 'error', db: dbOk ? 'ok' : 'error' });
};
app.get('/health', health);
app.get('/api/health', health);

app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Postgres error codes that are the client's fault, not the server's.
const PG_ERRORS = {
    '23505': [409, 'A record with these details already exists'],
    '23503': [400, 'A referenced record does not exist'],
    '23514': [400, 'The request violates a data rule (for example, capacity below occupied beds)'],
    '22P02': [400, 'Invalid value in request'],
    '22007': [400, 'Invalid date in request'],
    '22008': [400, 'Invalid date in request']
};

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, message: 'Malformed JSON body' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ success: false, message: 'Request body too large' });
    }
    const mapped = PG_ERRORS[err.code];
    if (mapped) {
        return res.status(mapped[0]).json({ success: false, message: mapped[1] });
    }
    console.error('Unhandled error:', err);
    return res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(!isProd && { detail: err.message })
    });
});

if (require.main === module) {
    const port = parseInt(process.env.PORT, 10) || 5124;
    const server = app.listen(port, () => {
        console.log(`Hostel API listening on port ${port} (${process.env.NODE_ENV || 'development'})`);
    });
    const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

module.exports = app;
