-- Recipe Finder Database Setup Script
-- Chạy script này trong MySQL Workbench hoặc MySQL Command Line

-- Tạo database
CREATE DATABASE IF NOT EXISTS recipe_finder;

-- Sử dụng database
USE recipe_finder;

-- Tạo bảng recipes
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
);

-- Tạo bảng nutrition với foreign key
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
);

-- Tạo indexes để tăng performance
CREATE INDEX idx_recipe_title ON recipes(title);
CREATE INDEX idx_recipe_category ON recipes(category);
CREATE INDEX idx_nutrition_recipe_id ON nutrition(recipe_id);

-- Hiển thị thông tin tables
SHOW TABLES;

DESCRIBE recipes;
DESCRIBE nutrition;

SELECT 'Database setup completed successfully!' as message;
