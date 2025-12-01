-- Migration: Add authentication tables
-- Date: 2025-11-27

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- Add user_id column to recipes table
ALTER TABLE recipes 
ADD COLUMN user_id INT,
ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create index on user_id for faster queries
CREATE INDEX idx_user_id ON recipes(user_id);

-- Sample users (passwords are hashed for 'password123')
-- Username: demo1, Password: password123
-- Username: demo2, Password: password123
INSERT INTO users (username, email, password) VALUES 
('demo1', 'demo1@recipe-finder.com', '$2a$10$YourHashedPasswordHere1'),
('demo2', 'demo2@recipe-finder.com', '$2a$10$YourHashedPasswordHere2');
