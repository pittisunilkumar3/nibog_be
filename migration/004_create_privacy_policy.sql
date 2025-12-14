-- Create privacy_policy table
CREATE TABLE IF NOT EXISTS privacy_policy (
  id INT AUTO_INCREMENT PRIMARY KEY,
  html_content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial privacy policy
INSERT INTO privacy_policy (html_content) VALUES ('<h1>Default Privacy Policy</h1><p>This is the default privacy policy.</p>');
