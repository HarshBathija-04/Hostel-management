# 🚀 Quick Setup Guide

This guide will help you quickly set up and run the Hostel Room Allotment System.

## Prerequisites

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **MySQL** (v8.0 or higher) - [Download here](https://dev.mysql.com/downloads/)
- **npm** (comes with Node.js)

## Step 1: Install Dependencies

Open a terminal and navigate to the project folder:

```bash
cd hostel-system/backend
npm install
```

## Step 2: Set Up the Database

### Option A: Using the Setup Script (Recommended)

```bash
cd ..
node scripts/setup-database.js
```

Follow the prompts to enter your MySQL credentials.

### Option B: Manual Setup

1. Create the database:
```bash
mysql -u root -p -e "CREATE DATABASE hostel_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

2. Import the schema:
```bash
mysql -u root -p hostel_db < database/schema.sql
```

3. Import test data (optional):
```bash
mysql -u root -p hostel_db < database/test_data.sql
```

4. Create a `.env` file in the `backend` folder:
```env
NODE_ENV=development
PORT=5000
HOST=localhost

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=hostel_db

JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=24h
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRE=7d

BCRYPT_ROUNDS=10
```

## Step 3: Start the Server

```bash
cd backend
npm start
```

You should see:
```
✅ Database connection established successfully
Server running at: http://localhost:5000
```

## Step 4: Access the Application

### Option A: Direct File Access

Simply open `frontend/index.html` in your web browser.

### Option B: Using a Local Server (Recommended)

```bash
cd frontend
npx serve .
```

Then open `http://localhost:3000` in your browser.

## Default Login Credentials

### Admin Login
- **Username:** `superadmin`
- **Password:** `admin123`

### Student Login
- **Student ID:** `STU2024001`
- **Password:** `student123`

## Troubleshooting

### Database Connection Issues

1. Make sure MySQL is running:
```bash
# Windows
net start mysql

# Mac/Linux
sudo service mysql start
```

2. Check your MySQL credentials in the `.env` file

3. Test the connection:
```bash
mysql -u root -p -e "SHOW DATABASES;"
```

### Port Already in Use

If port 5000 is already in use, change it in the `.env` file:
```env
PORT=5001
```

### CORS Issues

If you encounter CORS errors, make sure the `CORS_ORIGIN` in `.env` matches your frontend URL:
```env
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:5500
```

## Next Steps

- 📖 Read the full [README.md](README.md) for detailed documentation
- 🔍 Explore the API endpoints at `http://localhost:5000/api/health`
- 👤 Register a new student account
- 🏢 Log in as admin to manage hostel data

## Need Help?

If you encounter any issues:

1. Check the server logs for error messages
2. Verify all environment variables are set correctly
3. Ensure MySQL is running and accessible
4. Check that all dependencies are installed

For more information, see the [README.md](README.md) file.