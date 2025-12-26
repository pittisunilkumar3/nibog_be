-- Migration: Add Google Sign-In support to users table

-- Add google_id column to store unique Google user ID
ALTER TABLE `users` 
ADD COLUMN `google_id` VARCHAR(255) NULL UNIQUE AFTER `email`,
ADD COLUMN `auth_provider` ENUM('local', 'google') NOT NULL DEFAULT 'local' AFTER `google_id`,
ADD INDEX `idx_google_id` (`google_id`);

-- Make password_hash nullable since Google users won't have a password
-- (Already nullable in the original migration)

-- Update existing users to have 'local' as auth_provider
UPDATE `users` SET `auth_provider` = 'local' WHERE `auth_provider` IS NULL OR `auth_provider` = '';
