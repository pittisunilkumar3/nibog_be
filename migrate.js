const fs = require('fs');
const path = require('path');
const { pool } = require('./config/config');

const migrationDir = path.join(__dirname, 'migration');

console.log('🚀 Starting database migration...\n');

// Read all SQL files from migration directory
fs.readdir(migrationDir, (err, files) => {
  if (err) {
    console.error('❌ Error reading migration directory:', err);
    process.exit(1);
  }

  // Filter only .sql files and sort them
  const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();

  if (sqlFiles.length === 0) {
    console.log('⚠️  No migration files found in migration folder');
    process.exit(0);
  }

  console.log(`📁 Found ${sqlFiles.length} migration file(s):\n`);

  // Execute migrations sequentially
  let completedCount = 0;

  const executeMigration = (index) => {
    if (index >= sqlFiles.length) {
      console.log(`\n✅ Migration completed! ${completedCount}/${sqlFiles.length} file(s) executed successfully.`);
      pool.end();
      process.exit(0);
      return;
    }

    const file = sqlFiles[index];
    const filePath = path.join(migrationDir, file);
    
    console.log(`📄 Executing: ${file}`);

    fs.readFile(filePath, 'utf8', (err, sql) => {
      if (err) {
        console.error(`❌ Error reading file ${file}:`, err.message);
        executeMigration(index + 1);
        return;
      }

      // Split SQL file by semicolons to handle multiple queries
      const queries = sql.split(';').filter(q => q.trim().length > 0);

      let queryIndex = 0;
      const executeQuery = () => {
        if (queryIndex >= queries.length) {
          console.log(`   ✓ ${file} executed successfully\n`);
          completedCount++;
          executeMigration(index + 1);
          return;
        }

        const query = queries[queryIndex].trim();
        if (query) {
          pool.query(query, (error) => {
            if (error) {
              console.error(`   ❌ Error in ${file}:`, error.message);
            }
            queryIndex++;
            executeQuery();
          });
        } else {
          queryIndex++;
          executeQuery();
        }
      };

      executeQuery();
    });
  };

  executeMigration(0);
});
