/**
 * Hostel Room Allotment System - Main Server File
 * Express.js server with MySQL database integration
 */

// =====================================================
// Load Environment Variables
// =====================================================
require('dotenv').config();

// =====================================================
// Import Dependencies
// =====================================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import database configuration
const { testConnection } = require('./config/database');

// Import routes
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');

// =====================================================
// Initialize Express App
// =====================================================
const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

// =====================================================
// Security Middleware
// =====================================================

// Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            connectSrc: ["'self'", `http://localhost:${PORT}`]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: {
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes.'
    }
});
app.use('/api/students/login', authLimiter);
app.use('/api/admin/login', authLimiter);

// =====================================================
// Logging Middleware
// =====================================================
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// =====================================================
// Body Parsing Middleware
// =====================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =====================================================
// Static Files Middleware
// =====================================================
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend')));
}

// =====================================================
// API Routes
// =====================================================

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const dbConnected = await testConnection();
    res.status(dbConnected ? 200 : 500).json({
        success: dbConnected,
        message: dbConnected ? 'Server is running and database is connected' : 'Database connection failed',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// API routes
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);

// =====================================================
// Frontend Routes (for SPA)
// =====================================================
if (process.env.NODE_ENV === 'production') {
    // Serve student portal
    app.get('/student/*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/pages/student', 'index.html'));
    });

    // Serve admin portal
    app.get('/admin/*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/pages/admin', 'index.html'));
    });

    // Serve main pages
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
    });
}

// =====================================================
// Error Handling Middleware
// =====================================================

// 404 - Route not found
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Handle specific error types
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized access'
        });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: err.errors
        });
    }

    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            message: 'Duplicate entry - record already exists'
        });
    }

    if (err.code === 'ER_NO_REFERENCED_ROW') {
        return res.status(400).json({
            success: false,
            message: 'Referenced record not found'
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// =====================================================
// Server Initialization
// =====================================================

const startServer = async () => {
    try {
        // Test database connection
        console.log('🔌 Testing database connection...');
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('❌ Failed to connect to database. Please check your configuration.');
            process.exit(1);
        }

        // Start server
        app.listen(PORT, HOST, () => {
            console.log('╔════════════════════════════════════════════════════════╗');
            console.log('║     🏨 Hostel Room Allotment System - Server           ║');
            console.log('╠════════════════════════════════════════════════════════╣');
            console.log(`║  🌐 Server running at: http://${HOST}:${PORT}              ║`);
            console.log(`║  📁 Environment: ${process.env.NODE_ENV || 'development'}${' '.repeat(28 - (process.env.NODE_ENV || 'development').length)}║`);
            console.log(`║  🗄️  Database: Connected${' '.repeat(25)}║`);
            console.log('╠════════════════════════════════════════════════════════╣');
            console.log('║  API Endpoints:                                        ║');
            console.log(`║    • Health Check: http://${HOST}:${PORT}/api/health         ║`);
            console.log(`║    • Student API:  http://${HOST}:${PORT}/api/students       ║`);
            console.log(`║    • Admin API:    http://${HOST}:${PORT}/api/admin          ║`);
            console.log('╚════════════════════════════════════════════════════════╝');
        });

    } catch (error) {
        console.error('❌ Server startup error:', error);
        process.exit(1);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    process.exit(1);
});

// Start the server
startServer();

// =====================================================
// Export for testing
// =====================================================
module.exports = app;