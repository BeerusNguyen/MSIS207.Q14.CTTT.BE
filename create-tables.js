// Script to create new tables for extended API functionality
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'recipe_finder'
};

async function createTables() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');

        // Create meal_plans table
        console.log('📦 Creating meal_plans table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS meal_plans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                date DATE NOT NULL,
                meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
                recipe_id INT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ meal_plans table created');

        // Create favorites table
        console.log('📦 Creating favorites table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS favorites (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                recipe_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
                UNIQUE KEY unique_favorite (user_id, recipe_id)
            )
        `);
        console.log('✅ favorites table created');

        // Create shopping_list table
        console.log('📦 Creating shopping_list table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS shopping_list (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                ingredient VARCHAR(255) NOT NULL,
                quantity VARCHAR(100),
                recipe_id INT,
                is_checked BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ shopping_list table created');

        // Create categories table
        console.log('📦 Creating categories table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                image VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ categories table created');

        // Create recipe_categories table
        console.log('📦 Creating recipe_categories table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS recipe_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                recipe_id INT NOT NULL,
                category_id INT NOT NULL,
                FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
                UNIQUE KEY unique_recipe_category (recipe_id, category_id)
            )
        `);
        console.log('✅ recipe_categories table created');

        // Create ratings table
        console.log('📦 Creating ratings table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS ratings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                recipe_id INT NOT NULL,
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                review TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_recipe_rating (user_id, recipe_id)
            )
        `);
        console.log('✅ ratings table created');

        // Insert default categories
        console.log('📦 Inserting default categories...');
        const categories = [
            ['Breakfast', 'Morning meals and breakfast recipes'],
            ['Lunch', 'Midday meals and lunch recipes'],
            ['Dinner', 'Evening meals and dinner recipes'],
            ['Dessert', 'Sweet treats and desserts'],
            ['Snack', 'Quick bites and snacks'],
            ['Vegetarian', 'Meat-free recipes'],
            ['Vegan', 'Plant-based recipes'],
            ['Quick & Easy', 'Recipes under 30 minutes'],
            ['Healthy', 'Nutritious and healthy options'],
            ['Comfort Food', 'Hearty and satisfying meals'],
            ['Asian', 'Asian cuisine recipes'],
            ['Italian', 'Italian cuisine recipes']
        ];

        for (const [name, description] of categories) {
            try {
                await connection.execute(
                    'INSERT IGNORE INTO categories (name, description) VALUES (?, ?)',
                    [name, description]
                );
            } catch (e) {
                // Ignore duplicate errors
            }
        }
        console.log('✅ Default categories inserted');

        // Show all tables
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('\n📋 All tables in database:');
        tables.forEach(table => {
            console.log('  -', Object.values(table)[0]);
        });

        console.log('\n🎉 All tables created successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('👋 Database connection closed');
        }
    }
}

createTables();
