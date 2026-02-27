// Run database migration script
const { promisePool } = require('./config/config');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running payment table migration...');
    
    const migrationSQL = `
      ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS phonepe_transaction_id VARCHAR(100) DEFAULT NULL AFTER transaction_id,
      ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP NULL DEFAULT NULL AFTER payment_status,
      ADD COLUMN IF NOT EXISTS gateway_response JSON DEFAULT NULL AFTER payment_date,
      ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT NULL AFTER gateway_response,
      ADD COLUMN IF NOT EXISTS refund_date TIMESTAMP NULL DEFAULT NULL AFTER refund_amount,
      ADD COLUMN IF NOT EXISTS refund_reason TEXT DEFAULT NULL AFTER refund_date,
      ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL AFTER refund_reason
    `;
    
    // Split and run each ALTER statement separately for better error handling
    const alterStatements = [
      `ALTER TABLE payments ADD COLUMN phonepe_transaction_id VARCHAR(100) DEFAULT NULL AFTER transaction_id`,
      `ALTER TABLE payments ADD COLUMN payment_date TIMESTAMP NULL DEFAULT NULL AFTER payment_status`,
      `ALTER TABLE payments ADD COLUMN gateway_response JSON DEFAULT NULL AFTER payment_date`,
      `ALTER TABLE payments ADD COLUMN refund_amount DECIMAL(10,2) DEFAULT NULL AFTER gateway_response`,
      `ALTER TABLE payments ADD COLUMN refund_date TIMESTAMP NULL DEFAULT NULL AFTER refund_amount`,
      `ALTER TABLE payments ADD COLUMN refund_reason TEXT DEFAULT NULL AFTER refund_date`,
      `ALTER TABLE payments ADD COLUMN admin_notes TEXT DEFAULT NULL AFTER refund_reason`
    ];
    
    for (const statement of alterStatements) {
      try {
        await promisePool.query(statement);
        console.log('✅ Column added successfully');
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('⚠️ Column already exists, skipping...');
        } else {
          console.error('❌ Error adding column:', err.message);
        }
      }
    }
    
    console.log('✅ Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
