-- Migration: Update payments table to add missing columns
-- This adds support for PhonePe transactions, refunds, and admin notes

-- Add missing columns to payments table
ALTER TABLE `payments`
ADD COLUMN `phonepe_transaction_id` VARCHAR(100) DEFAULT NULL AFTER `transaction_id`,
ADD COLUMN `payment_date` TIMESTAMP NULL DEFAULT NULL AFTER `payment_status`,
ADD COLUMN `gateway_response` JSON DEFAULT NULL AFTER `payment_date`,
ADD COLUMN `refund_amount` DECIMAL(10,2) DEFAULT NULL AFTER `gateway_response`,
ADD COLUMN `refund_date` TIMESTAMP NULL DEFAULT NULL AFTER `refund_amount`,
ADD COLUMN `refund_reason` TEXT DEFAULT NULL AFTER `refund_date`,
ADD COLUMN `admin_notes` TEXT DEFAULT NULL AFTER `refund_reason`;

-- Add index on phonepe_transaction_id for faster lookups
CREATE INDEX `idx_phonepe_transaction_id` ON `payments` (`phonepe_transaction_id`);

-- Update payment_status to allow more statuses
ALTER TABLE `payments`
MODIFY COLUMN `payment_status` VARCHAR(20) DEFAULT 'pending';
