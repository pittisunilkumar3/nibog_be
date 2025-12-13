-- Create footer_settings table
CREATE TABLE IF NOT EXISTS footer_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  company_description TEXT DEFAULT NULL,
  address TEXT DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  email VARCHAR(100) DEFAULT NULL,
  newsletter_enabled TINYINT(1) DEFAULT 1,
  copyright_text TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
