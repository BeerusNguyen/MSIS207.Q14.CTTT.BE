-- =====================================================
-- ADD EMAIL VERIFICATION TO USERS TABLE
-- Recipe Finder - Email Verification Feature
-- Run this script in MySQL Workbench or phpMyAdmin
-- =====================================================

USE recipe_finder;

-- =====================================================
-- STEP 1: RESET ALL ACCOUNTS (XÓA TẤT CẢ TÀI KHOẢN CŨ)
-- =====================================================

-- Tắt foreign key checks tạm thời
SET FOREIGN_KEY_CHECKS = 0;

-- Xóa tất cả password resets
TRUNCATE TABLE password_resets;

-- Xóa tất cả shopping list items
TRUNCATE TABLE shopping_list;

-- Xóa tất cả meal plans
TRUNCATE TABLE meal_plans;

-- Xóa tất cả favorites
TRUNCATE TABLE favorites;

-- Xóa tất cả users
TRUNCATE TABLE users;

-- Bật lại foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- STEP 2: ADD EMAIL VERIFICATION COLUMNS
-- =====================================================

-- Kiểm tra xem cột đã tồn tại chưa và thêm nếu chưa có
-- Thêm cột is_verified
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Thêm cột verification_token
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);

-- Thêm cột verification_token_expiry
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_token_expiry DATETIME;

-- =====================================================
-- STEP 3: CREATE INDEX (nếu chưa có)
-- =====================================================

-- Tạo index cho verification_token (bỏ qua lỗi nếu đã tồn tại)
-- DROP INDEX IF EXISTS idx_verification_token ON users;
-- CREATE INDEX idx_verification_token ON users(verification_token);

-- =====================================================
-- VERIFY STRUCTURE
-- =====================================================

-- Kiểm tra cấu trúc bảng users sau khi thêm cột
DESCRIBE users;

SELECT 'Email verification columns added successfully!' AS Status;
SELECT 'All user accounts have been reset!' AS Status;
