const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'recipe_finder',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

const initDatabase = async () => {
  try {
    // Create database if not exists
    const connection = mysql.createConnection({ 
      host: process.env.DB_HOST || 'localhost', 
      user: process.env.DB_USER || 'root', 
      password: process.env.DB_PASSWORD || '' 
    });
    const promiseConnection = connection.promise();
    
    await promiseConnection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'recipe_finder'}`);
    console.log('✅ Database created/verified');
    await promiseConnection.end();
    
    // Create recipes table
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id INT AUTO_INCREMENT PRIMARY KEY, 
        title VARCHAR(255) NOT NULL, 
        ingredients TEXT NOT NULL, 
        servings VARCHAR(50), 
        instructions TEXT, 
        image VARCHAR(500), 
        category VARCHAR(100), 
        area VARCHAR(100), 
        videoUrl VARCHAR(500), 
        recipeId VARCHAR(100), 
        source VARCHAR(50), 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create nutrition table
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS nutrition (
        id INT AUTO_INCREMENT PRIMARY KEY, 
        recipe_id INT, 
        calories DECIMAL(10, 2), 
        protein DECIMAL(10, 2), 
        carbs DECIMAL(10, 2), 
        fat DECIMAL(10, 2), 
        fiber DECIMAL(10, 2), 
        sugar DECIMAL(10, 2), 
        sodium DECIMAL(10, 2), 
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ Tables created/verified');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    throw error;
  }
};

module.exports = { pool: promisePool, initDatabase };
