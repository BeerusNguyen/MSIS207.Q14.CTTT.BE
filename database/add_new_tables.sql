-- ============================================
-- NEW TABLES FOR EXTENDED API FUNCTIONALITY
-- Run this script in MySQL Workbench
-- ============================================

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    recipe_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (user_id, recipe_id)
);

-- Meal Plans table
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
);

-- Shopping List table
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
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe Categories (many-to-many)
CREATE TABLE IF NOT EXISTS recipe_categories (
    recipe_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (recipe_id, category_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Ratings table
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
    UNIQUE KEY unique_rating (user_id, recipe_id)
);

-- Insert default categories
INSERT IGNORE INTO categories (name, description) VALUES
('Breakfast', 'Start your day right with delicious breakfast recipes'),
('Lunch', 'Midday meals to keep you energized'),
('Dinner', 'Satisfying evening dishes for the whole family'),
('Desserts', 'Sweet treats and delicious desserts'),
('Appetizers', 'Starters and snacks to whet your appetite'),
('Salads', 'Fresh and healthy salad recipes'),
('Soups', 'Warm and comforting soup recipes'),
('Vegetarian', 'Delicious meat-free dishes'),
('Vegan', 'Plant-based recipes without animal products'),
('Seafood', 'Fish and shellfish dishes'),
('Asian', 'Flavors from Eastern cuisine'),
('Italian', 'Classic Mediterranean flavors'),
('Mexican', 'Spicy Latin American dishes'),
('American', 'Classic American comfort food'),
('Quick & Easy', 'Recipes under 30 minutes');

-- Create indexes for better performance
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_meal_plans_user_date ON meal_plans(user_id, date);
CREATE INDEX idx_shopping_list_user ON shopping_list(user_id);
CREATE INDEX idx_ratings_recipe ON ratings(recipe_id);
CREATE INDEX idx_recipe_categories_recipe ON recipe_categories(recipe_id);
CREATE INDEX idx_recipe_categories_category ON recipe_categories(category_id);

-- Add category_id to recipes table if not exists
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category_id INT DEFAULT NULL;
ALTER TABLE recipes ADD CONSTRAINT fk_recipe_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

SELECT 'All tables created successfully!' as status;
