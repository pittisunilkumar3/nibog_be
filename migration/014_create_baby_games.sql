-- Migration: Create baby_games table with image_url and priority columns
CREATE TABLE IF NOT EXISTS baby_games (
  id INT(11) NOT NULL AUTO_INCREMENT,
  game_name VARCHAR(255) NOT NULL,
  image_url VARCHAR(255) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  min_age INT(11) DEFAULT NULL,
  max_age INT(11) DEFAULT NULL,
  duration_minutes INT(11) DEFAULT NULL,
  categories LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(categories)),
  priority INT(11) DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
