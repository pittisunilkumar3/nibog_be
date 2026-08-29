const mysql = require("mysql2/promise");
const fs = require("fs");
const env = Object.fromEntries(fs.readFileSync(__dirname + "/.env", "utf8").split("\n").filter(l => l.includes("=") && !l.startsWith("#")).map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));

(async () => {
  const c = await mysql.createConnection({ host: env.DB_HOST, user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME, multipleStatements: true });
  await c.query(`
    CREATE TABLE IF NOT EXISTS certificate_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      type ENUM('participation','winner','event_specific') NOT NULL DEFAULT 'participation',
      certificate_title VARCHAR(500),
      certificate_title_style JSON,
      appreciation_text TEXT,
      appreciation_text_style JSON,
      signature_image VARCHAR(500),
      signature_style JSON,
      background_image VARCHAR(500),
      background_style JSON,
      paper_size ENUM('a4','letter','a3') NOT NULL DEFAULT 'a4',
      orientation ENUM('landscape','portrait') NOT NULL DEFAULT 'landscape',
      fields JSON,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS certificates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      certificate_number VARCHAR(100),
      template_id INT NOT NULL,
      event_id INT,
      game_id INT,
      user_id INT,
      parent_id INT,
      child_id INT,
      participant_name VARCHAR(255),
      certificate_data JSON,
      status ENUM('generated','sent','downloaded','failed') NOT NULL DEFAULT 'generated',
      generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sent_at TIMESTAMP NULL,
      downloaded_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_certificate_number (certificate_number),
      KEY idx_cert_event (event_id),
      KEY idx_cert_template (template_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log("✓ certificate tables created");
  const [t] = await c.query("SELECT COUNT(*) n FROM certificate_templates");
  console.log("templates:", t[0].n);
  await c.end();
  process.exit(0);
})().catch(e => { console.error("ERR:", e.message); process.exit(1); });
