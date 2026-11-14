const phonePeEnv = Object.fromEntries(
  [
    'PHONEPE_ENVIRONMENT',
    'PHONEPE_PROD_MERCHANT_ID',
    'PHONEPE_PROD_SALT_KEY',
    'PHONEPE_PROD_SALT_INDEX',
    'PHONEPE_TEST_MERCHANT_ID',
    'PHONEPE_TEST_SALT_KEY',
    'PHONEPE_TEST_SALT_INDEX'
  ]
    .filter(key => process.env[key])
    .map(key => [key, process.env[key]])
);

module.exports = {
  apps: [{
    name: 'nibog-backend',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3004,
      ...phonePeEnv
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
