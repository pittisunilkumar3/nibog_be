-- Migration: Create email_settings table and insert initial row

CREATE TABLE IF NOT EXISTS `email_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `smtp_host` text NOT NULL,
  `smtp_port` int(11) NOT NULL CHECK (`smtp_port` > 0 and `smtp_port` <= 65535),
  `smtp_username` text NOT NULL,
  `smtp_password` text NOT NULL,
  `sender_name` text NOT NULL,
  `sender_email` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `email_settings` (
  `smtp_host`, `smtp_port`, `smtp_username`, `smtp_password`, `sender_name`, `sender_email`
) VALUES (
  'smtp.example.com', 587, 'user@example.com', 'password123', 'Example Sender', 'sender@example.com'
);
