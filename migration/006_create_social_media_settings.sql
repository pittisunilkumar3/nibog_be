-- Create social_media_settings table
CREATE TABLE IF NOT EXISTS social_media_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  facebook_url TEXT NOT NULL DEFAULT 'https://www.facebook.com/share/1K8H6SPtR5/',
  instagram_url TEXT NOT NULL DEFAULT 'https://www.instagram.com/nibog_100',
  linkedin_url TEXT NOT NULL DEFAULT 'https://www.linkedin.com/in/new-india-baby-olympicgames',
  youtube_url TEXT NOT NULL DEFAULT 'https://youtube.com/@newindiababyolympics',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
