// Script to create new tables for extended API functionality
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'recipe_finder',
    port: process.env.DB_PORT || 3306,
    ssl: {
        rejectUnauthorized: false
    }
};

async function createTables() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');

        // ==========================================
        // PHẦN 1: TẠO CÁC BẢNG GỐC (Cha) TRƯỚC
        // ==========================================

        // 1. Create USERS table (Quan trọng nhất)
        console.log('📦 Creating users table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ users table created');

        // 2. Create RECIPES table (Phụ thuộc users)
        console.log('📦 Creating recipes table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS recipes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                ingredients TEXT,
                servings VARCHAR(50),
                instructions TEXT,
                image VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ recipes table created');

        // 3. Create NUTRITION table (Phụ thuộc recipes)
        console.log('📦 Creating nutrition table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS nutrition (
                id INT AUTO_INCREMENT PRIMARY KEY,
                recipe_id INT NOT NULL,
                calories FLOAT DEFAULT 0,
                protein FLOAT DEFAULT 0,
                carbs FLOAT DEFAULT 0,
                fat FLOAT DEFAULT 0,
                fiber FLOAT DEFAULT 0,
                sugar FLOAT DEFAULT 0,
                sodium FLOAT DEFAULT 0,
                FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ nutrition table created');

        // 4. Create CATEGORIES table (Độc lập)
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

        // ==========================================
        // PHẦN 2: TẠO CÁC BẢNG PHỤ THUỘC (Con)
        // ==========================================

        // 5. Create meal_plans table
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

        // 6. Create favorites table
        console.log('📦 Creating favorites table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS favorites (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                recipe_id INT NOT NULL,
                recipe_title VARCHAR(255),
                recipe_image VARCHAR(500),
                source_type VARCHAR(50) DEFAULT 'local',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                -- Lưu ý: favorites có thể lưu recipe bên ngoài nên có thể không FK cứng vào bảng recipes
                -- Nhưng nếu logic của bạn chỉ lưu recipe nội bộ thì giữ dòng dưới:
                FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
                UNIQUE KEY unique_favorite (user_id, recipe_id)
            )
        `);
        console.log('✅ favorites table created');

        // 7. Create shopping_list table
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

        // 8. Create recipe_categories table
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

        // 9. Create ratings table
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

        // ==========================================
        // PHẦN 3: NẠP DỮ LIỆU MẪU
        // ==========================================

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
        // Quan trọng: In ra lỗi để debug dễ hơn
        if (error.sql) console.error('SQL causing error:', error.sql);
    } finally {
        if (connection) {
            await connection.end();
            console.log('👋 Database connection closed');
        }
    }
}

createTables();