-- Create general_settings table
CREATE TABLE IF NOT EXISTS general_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_name TEXT NOT NULL,
  site_tagline TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  logo_path TEXT DEFAULT NULL,
  favicon_path TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial general settings
INSERT INTO general_settings (site_name, site_tagline, contact_email, contact_phone, address, logo_path, favicon_path)
VALUES ('Default Site', 'Your site tagline here', 'contact@default.com', '000-000-0000', 'Default address', NULL, NULL);