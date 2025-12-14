CREATE TABLE IF NOT EXISTS venues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venue_name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city_id INT NOT NULL,
  capacity INT DEFAULT 0,
  venue_type VARCHAR(50),
  contact_number VARCHAR(20),
  email VARCHAR(100),
  description TEXT,
  facilities JSON,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
  INDEX idx_city_id (city_id),
  INDEX idx_venue_name (venue_name),
  INDEX idx_venue_type (venue_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
