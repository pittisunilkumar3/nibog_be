-- Migration: Create merged addons table with image_url

CREATE TABLE IF NOT EXISTS `addons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `category` enum('meal','merchandise','service','other') NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `has_variants` tinyint(1) DEFAULT 0,
  `stock_quantity` int(11) DEFAULT 0,
  `sku` text NOT NULL,
  `bundle_min_quantity` int(11) DEFAULT NULL,
  `bundle_discount_percentage` decimal(5,2) DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
