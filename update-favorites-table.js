// Script to update favorites table for external API recipes
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'recipe_finder'
};

async function updateFavoritesTable() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');

        // Drop the old favorites table
        console.log('🗑️ Dropping old favorites table...');
        await connection.execute('DROP TABLE IF EXISTS favorites');
        console.log('✅ Old favorites table dropped');

        // Create new favorites table without foreign key on recipe_id
        console.log('📦 Creating new favorites table...');
        await connection.execute(`
            CREATE TABLE favorites (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                recipe_id VARCHAR(50) NOT NULL,
                recipe_title VARCHAR(500),
                recipe_image VARCHAR(1000),
                source_type ENUM('local', 'spoonacular', 'themealdb') DEFAULT 'spoonacular',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_favorite (user_id, recipe_id)
            )
        `);
        console.log('✅ New favorites table created');

        console.log('\n🎉 Favorites table updated successfully!');
        console.log('Now you can favorite recipes from external APIs.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('👋 Database connection closed');
        }
    }
}

updateFavoritesTable();
