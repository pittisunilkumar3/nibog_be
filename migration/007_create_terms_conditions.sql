-- Create terms_conditions table
CREATE TABLE IF NOT EXISTS terms_conditions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  html_content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial terms and conditions
INSERT INTO terms_conditions (html_content) VALUES ('<h1>Default Terms & Conditions</h1><p>This is the default terms and conditions.</p>');
