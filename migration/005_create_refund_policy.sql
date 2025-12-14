-- Create refund_policy table
CREATE TABLE IF NOT EXISTS refund_policy (
  id INT AUTO_INCREMENT PRIMARY KEY,
  html_content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial refund policy
INSERT INTO refund_policy (html_content) VALUES ('<h1>Default Refund Policy</h1><p>This is the default refund policy.</p>');
