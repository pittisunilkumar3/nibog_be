const bcrypt = require('bcryptjs');

// Generate hash for password 'superadmin'
bcrypt.hash('superadmin', 10, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
  } else {
    console.log('Hashed password for "superadmin":');
    console.log(hash);
  }
});
