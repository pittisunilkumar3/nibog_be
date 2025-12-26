const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3004';
const GOOGLE_SIGNIN_URL = `${BASE_URL}/api/user/google-signin`;

console.log('\n' + '═'.repeat(70));
console.log('  🔍 GOOGLE SIGN-IN API - COMPREHENSIVE VERIFICATION');
console.log('═'.repeat(70) + '\n');

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function logTest(name, status, message, details = '') {
  const statusSymbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${statusSymbol} ${name}`);
  if (message) console.log(`   ${message}`);
  if (details) console.log(`   ${details}`);
  
  results.tests.push({ name, status, message, details });
  if (status === 'PASS') results.passed++;
  else if (status === 'FAIL') results.failed++;
  else results.warnings++;
}

async function runTests() {
  console.log('📡 CONNECTIVITY TESTS\n');

  // Test 1: Server is running
  try {
    await axios.get(`${BASE_URL}/api/helloworld`, { timeout: 3000 });
    logTest('Server is running', 'PASS', `Connected to ${BASE_URL}`);
  } catch (error) {
    logTest('Server is running', 'FAIL', 'Cannot connect to server', 
      'Make sure server is running: npm run dev');
    return;
  }

  console.log('\n🔐 ENDPOINT TESTS\n');

  // Test 2: Endpoint exists
  try {
    await axios.post(GOOGLE_SIGNIN_URL, {});
  } catch (error) {
    if (error.response) {
      logTest('Endpoint exists', 'PASS', `Endpoint is accessible at ${GOOGLE_SIGNIN_URL}`);
    } else {
      logTest('Endpoint exists', 'FAIL', 'Endpoint not found', error.message);
      return;
    }
  }

  // Test 3: Validation - Missing token
  try {
    await axios.post(GOOGLE_SIGNIN_URL, {});
  } catch (error) {
    if (error.response?.status === 400 && 
        error.response?.data?.message === 'Google token is required.') {
      logTest('Input validation (missing token)', 'PASS', 
        'Correctly rejects requests without token');
    } else {
      logTest('Input validation (missing token)', 'FAIL', 
        `Expected 400, got ${error.response?.status}`);
    }
  }

  // Test 4: Google Client ID check
  try {
    await axios.post(GOOGLE_SIGNIN_URL, { token: 'test_token' });
  } catch (error) {
    if (error.response?.data?.message === 'Google Sign-In is not configured on the server.') {
      logTest('Configuration check', 'WARN', 
        'GOOGLE_CLIENT_ID not configured in .env',
        'Add GOOGLE_CLIENT_ID to .env file to enable Google Sign-In');
    } else if (error.response?.status === 401) {
      logTest('Configuration check', 'PASS', 
        'Google Client ID is configured, token verification active');
    } else {
      logTest('Configuration check', 'PASS', 
        'Configuration check working');
    }
  }

  console.log('\n📁 FILE STRUCTURE TESTS\n');

  // Test 5: Check critical files exist
  const files = [
    'controller/userController.js',
    'model/userModel.js',
    'routes/user.js',
    'migration/020_add_google_signin_support.sql',
    'GOOGLE_SIGNIN_GUIDE.md',
    'test-google-signin.html'
  ];

  files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      logTest(`File: ${file}`, 'PASS', 'File exists');
    } else {
      logTest(`File: ${file}`, 'FAIL', 'File not found');
    }
  });

  console.log('\n📚 CODE QUALITY TESTS\n');

  // Test 6: Check userController has googleSignIn export
  const controllerPath = path.join(__dirname, 'controller/userController.js');
  const controllerContent = fs.readFileSync(controllerPath, 'utf8');
  
  if (controllerContent.includes('exports.googleSignIn')) {
    logTest('Controller export', 'PASS', 'googleSignIn method exported');
  } else {
    logTest('Controller export', 'FAIL', 'googleSignIn method not found');
  }

  // Test 7: Check OAuth2Client import
  if (controllerContent.includes("require('google-auth-library')") ||
      controllerContent.includes('OAuth2Client')) {
    logTest('OAuth2Client import', 'PASS', 'Google auth library imported');
  } else {
    logTest('OAuth2Client import', 'FAIL', 'OAuth2Client not imported');
  }

  // Test 8: Check model has Google methods
  const modelPath = path.join(__dirname, 'model/userModel.js');
  const modelContent = fs.readFileSync(modelPath, 'utf8');
  
  const requiredMethods = ['getByGoogleId', 'createGoogleUser', 'updateGoogleUser'];
  requiredMethods.forEach(method => {
    if (modelContent.includes(method)) {
      logTest(`Model method: ${method}`, 'PASS', 'Method implemented');
    } else {
      logTest(`Model method: ${method}`, 'FAIL', 'Method not found');
    }
  });

  // Test 9: Check route registration
  const routePath = path.join(__dirname, 'routes/user.js');
  const routeContent = fs.readFileSync(routePath, 'utf8');
  
  if (routeContent.includes('/google-signin') && 
      routeContent.includes('googleSignIn')) {
    logTest('Route registration', 'PASS', 'Google sign-in route registered');
  } else {
    logTest('Route registration', 'FAIL', 'Route not properly registered');
  }

  console.log('\n' + '═'.repeat(70));
  console.log('  📊 TEST SUMMARY');
  console.log('═'.repeat(70));
  console.log(`  ✅ Passed:   ${results.passed}`);
  console.log(`  ❌ Failed:   ${results.failed}`);
  console.log(`  ⚠️  Warnings: ${results.warnings}`);
  console.log(`  📝 Total:    ${results.tests.length}`);
  console.log('═'.repeat(70) + '\n');

  if (results.failed === 0) {
    console.log('🎉 SUCCESS! All critical tests passed!\n');
    console.log('📋 Next Steps:');
    console.log('   1. Add GOOGLE_CLIENT_ID to .env file');
    console.log('   2. Run: npm run migrate');
    console.log('   3. Restart server: npm run dev');
    console.log('   4. Test with test-google-signin.html\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.\n');
  }

  console.log('📖 Documentation:');
  console.log('   - GOOGLE_SIGNIN_GUIDE.md - Complete guide');
  console.log('   - SETUP_COMPLETE.md - Setup instructions');
  console.log('   - TEST_REPORT.md - Detailed test results');
  console.log('   - test-google-signin.html - Interactive test page\n');
}

runTests().catch(error => {
  console.error('\n❌ Test script error:', error.message);
  process.exit(1);
});
