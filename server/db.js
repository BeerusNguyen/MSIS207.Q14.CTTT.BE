const mysql = require('mysql2/promise');
require('dotenv').config();

// Create MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Thuathienhue75.',
    database: process.env.DB_NAME || 'recipe_finder',
    port: process.env.DB_PORT || 3306, // [MỚI] Thêm dòng này để nhận cổng từ Aiven
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // [MỚI] Cấu hình SSL: Nếu không phải localhost thì bật SSL để kết nối Aiven
    ssl: process.env.DB_HOST === 'localhost' ? undefined : {
        rejectUnauthorized: false
    }
});

// Initialize database - check connection
const initDatabase = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        
        // Check if required tables exist
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`📊 Found ${tables.length} tables in database`);
        
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Please check your database configuration in .env file');
    }
};

module.exports = { pool, initDatabase };