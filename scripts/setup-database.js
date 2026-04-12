/**
 * Database Setup Script
 * Creates database and tables for Hostel Room Allotment System
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Default configuration
const defaultConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'hostel_db'
};

async function prompt(question, defaultValue = '') {
    return new Promise((resolve) => {
        const promptText = defaultValue 
            ? `${question} (${defaultValue}): ` 
            : `${question}: `;
        rl.question(promptText, (answer) => {
            resolve(answer.trim() || defaultValue);
        });
    });
}

async function setupDatabase() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║     Hostel Room Allotment System - Database Setup      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    try {
        // Get database configuration
        const host = await prompt('MySQL Host', defaultConfig.host);
        const user = await prompt('MySQL User', defaultConfig.user);
        const password = await prompt('MySQL Password', defaultConfig.password);
        const database = await prompt('Database Name', defaultConfig.database);

        const config = { host, user, password };

        console.log('\n📡 Connecting to MySQL...');
        
        // Create connection without database
        const connection = await mysql.createConnection(config);
        
        console.log('✅ Connected to MySQL');
        
        // Create database
        console.log(`\n🗄️  Creating database '${database}'...`);
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log('✅ Database created');
        
        // Use database
        await connection.execute(`USE ${database}`);
        
        // Read and execute schema
        console.log('\n📋 Creating tables...');
        const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
        
        if (!fs.existsSync(schemaPath)) {
            console.error('❌ Schema file not found:', schemaPath);
            process.exit(1);
        }
        
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Split schema into individual statements
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        
        for (let statement of statements) {
            // Skip DELIMITER statements
            if (statement.includes('DELIMITER')) continue;
            
            try {
                await connection.execute(statement);
            } catch (err) {
                // Ignore certain errors
                if (err.message.includes('DELIMITER')) continue;
                console.warn('⚠️  Warning:', err.message);
            }
        }
        
        console.log('✅ Tables created successfully');
        
        // Ask if user wants to insert test data
        const insertTestData = await prompt('\nInsert test data? (y/n)', 'y');
        
        if (insertTestData.toLowerCase() === 'y') {
            console.log('\n📝 Inserting test data...');
            
            const testDataPath = path.join(__dirname, '..', 'database', 'test_data.sql');
            
            if (fs.existsSync(testDataPath)) {
                // Insert admin with hashed password
                const bcrypt = require('bcryptjs');
                const hashedPassword = await bcrypt.hash('admin123', 10);
                
                // Update admin passwords
                await connection.execute(
                    `UPDATE admin SET password = ? WHERE username = 'superadmin'`,
                    [hashedPassword]
                );
                
                // Update student passwords
                const studentHashedPassword = await bcrypt.hash('student123', 10);
                await connection.execute(
                    `UPDATE students SET password = ?`,
                    [studentHashedPassword]
                );
                
                console.log('✅ Test data inserted');
                console.log('\n📌 Default Credentials:');
                console.log('   Admin: superadmin / admin123');
                console.log('   Student: STU2024001 / student123');
            } else {
                console.warn('⚠️  Test data file not found');
            }
        }
        
        await connection.end();
        
        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║              ✅ Database Setup Complete!               ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');
        
        // Create .env file
        const envContent = `# Hostel Room Allotment System - Environment Configuration
NODE_ENV=development
PORT=5000
HOST=localhost

# Database Configuration
DB_HOST=${host}
DB_PORT=3306
DB_USER=${user}
DB_PASSWORD=${password}
DB_NAME=${database}

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=24h
JWT_REFRESH_SECRET=your_refresh_token_secret_change_this_in_production
JWT_REFRESH_EXPIRE=7d

# Bcrypt Configuration
BCRYPT_ROUNDS=10
`;
        
        const envPath = path.join(__dirname, '..', 'backend', '.env');
        fs.writeFileSync(envPath, envContent);
        console.log('📝 Created .env file at:', envPath);
        
        console.log('\n👉 Next steps:');
        console.log('   1. cd backend && npm install');
        console.log('   2. npm start');
        console.log('   3. Open frontend/index.html in your browser\n');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.log('\nTroubleshooting:');
        console.log('   - Make sure MySQL is running');
        console.log('   - Check your MySQL credentials');
        console.log('   - Ensure you have the necessary permissions');
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Run setup
setupDatabase();