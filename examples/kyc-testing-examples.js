/**
 * KYC Testing Examples
 * Demonstrates how to use YouVerify sandbox data for testing KYC verification flows
 * 
 * Run this script with: node examples/kyc-testing-examples.js
 */

const axios = require('axios');
const { getTestData, getTestScenario, isSandboxEnvironment } = require('../utils/youverifyConfig');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
let authToken = null;

/**
 * Helper function to make authenticated API requests
 */
const apiRequest = async (method, endpoint, data = null) => {
  const config = {
    method,
    url: `${API_BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    },
    ...(data && { data })
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`API Error (${method} ${endpoint}):`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Register a test user
 */
const registerTestUser = async (role = 'user') => {
  const userData = {
    first_name: 'John',
    last_name: 'Doe',
    email: `test.${role}.${Date.now()}@example.com`,
    password: 'password123',
    role: role
  };

  console.log(`\n📝 Registering test ${role}...`);
  const result = await apiRequest('POST', '/api/auth/register', userData);
  console.log(`✅ User registered: ${userData.email}`);
  return { userData, result };
};

/**
 * Login and get authentication token
 */
const loginUser = async (email, password) => {
  console.log(`\n🔐 Logging in user: ${email}`);
  const result = await apiRequest('POST', '/api/auth/login', { email, password });
  authToken = result.token;
  console.log('✅ Login successful, token obtained');
  return result;
};

/**
 * Get current KYC status
 */
const getKycStatus = async () => {
  console.log('\n📊 Checking KYC status...');
  const result = await apiRequest('GET', '/api/kyc/status');
  console.log('KYC Status:', JSON.stringify(result, null, 2));
  return result;
};

/**
 * Test Tier 1 verification with different scenarios
 */
const testTier1Verification = async () => {
  console.log('\n🔍 Testing Tier 1 Verification...');

  // Test successful verification
  console.log('\n✅ Testing successful Tier 1 verification...');
  const successScenario = getTestScenario('tier1', 'success');
  try {
    const result = await apiRequest('POST', '/api/kyc/tier1/submit', successScenario);
    console.log('Success result:', result.message);
    console.log('Tier 1 status:', result.kyc?.tier1?.status);
  } catch (error) {
    console.error('Unexpected error in success scenario');
  }

  // Test phone verification failure
  console.log('\n❌ Testing phone verification failure...');
  const phoneFailScenario = getTestScenario('tier1', 'phone_failure');
  try {
    await apiRequest('POST', '/api/kyc/tier1/submit', phoneFailScenario);
    console.log('Unexpected success - should have failed');
  } catch (error) {
    console.log('Expected failure:', error.response?.data?.message);
  }

  // Test NIN verification failure
  console.log('\n❌ Testing NIN verification failure...');
  const ninFailScenario = getTestScenario('tier1', 'nin_failure');
  try {
    await apiRequest('POST', '/api/kyc/tier1/submit', ninFailScenario);
    console.log('Unexpected success - should have failed');
  } catch (error) {
    console.log('Expected failure:', error.response?.data?.message);
  }
};

/**
 * Test Tier 3 verification with different scenarios
 */
const testTier3Verification = async () => {
  console.log('\n🏦 Testing Tier 3 Verification...');

  // Test successful verification
  console.log('\n✅ Testing successful Tier 3 verification...');
  const successScenario = getTestScenario('tier3', 'success');
  try {
    const result = await apiRequest('POST', '/api/kyc/tier3/submit', {
      ...successScenario,
      business_type: 'company'
    });
    console.log('Success result:', result.message);
    console.log('Tier 3 status:', result.kyc?.tier3?.status);
    console.log('Verification results:', result.verification_results);
  } catch (error) {
    console.error('Unexpected error in success scenario');
  }

  // Test BVN verification failure
  console.log('\n❌ Testing BVN verification failure...');
  const bvnFailScenario = getTestScenario('tier3', 'bvn_failure');
  try {
    const result = await apiRequest('POST', '/api/kyc/tier3/submit', {
      ...bvnFailScenario,
      business_name: 'Test Company Limited',
      business_type: 'company',
      rc_number: 'RC0000000'
    });
    console.log('Partial success result:', result.message);
    console.log('Verification results:', result.verification_results);
  } catch (error) {
    console.log('Expected partial failure:', error.response?.data?.message);
  }
};

/**
 * Display available test data
 */
const displayTestData = async () => {
  console.log('\n📋 Available Test Data:');
  
  if (!isSandboxEnvironment()) {
    console.log('❌ Not in sandbox environment - no test data available');
    return;
  }

  try {
    const sandboxData = await apiRequest('GET', '/api/kyc/sandbox-data');
    console.log('\n📱 Valid Phone Numbers:');
    sandboxData.data.tier1.valid.phone_numbers.forEach(phone => {
      console.log(`  - ${phone}`);
    });

    console.log('\n🆔 Valid NIMs:');
    sandboxData.data.tier1.valid.nins.forEach(nin => {
      console.log(`  - ${nin}`);
    });

    console.log('\n🏦 Valid Bank Accounts:');
    sandboxData.data.tier3.valid.bank_accounts.forEach(account => {
      console.log(`  - ${account.account_number} (${account.bank_name})`);
    });

    console.log('\n🏢 Valid Business Registration:');
    sandboxData.data.tier3.valid.businesses.forEach(business => {
      console.log(`  - ${business.rc_number} (${business.business_name})`);
    });

  } catch (error) {
    console.error('Error fetching sandbox data');
  }
};

/**
 * Run comprehensive KYC testing suite
 */
const runKycTests = async (userRole = 'user') => {
  try {
    console.log('🚀 Starting KYC Testing Suite');
    console.log(`Environment: ${isSandboxEnvironment() ? 'Sandbox' : 'Production'}`);
    
    if (!isSandboxEnvironment()) {
      console.log('⚠️  Warning: Not in sandbox environment. Testing with real data!');
    }

    // Display available test data
    await displayTestData();

    // Register and login test user
    const { userData } = await registerTestUser(userRole);
    await loginUser(userData.email, userData.password);

    // Check initial KYC status
    await getKycStatus();

    // Test Tier 1 verification
    await testTier1Verification();

    // Check KYC status after Tier 1
    await getKycStatus();

    // Test Tier 3 verification (if user completed Tier 1)
    if (userRole === 'user') {
      await testTier3Verification();
      
      // Final KYC status check
      await getKycStatus();
    }

    console.log('\n🎉 KYC Testing Suite completed successfully!');

  } catch (error) {
    console.error('\n💥 Testing suite failed:', error.message);
    process.exit(1);
  }
};

/**
 * Main execution
 */
const main = async () => {
  const args = process.argv.slice(2);
  const userRole = args[0] || 'user';

  if (!['user', 'owner', 'admin'].includes(userRole)) {
    console.error('Invalid role. Use: user, owner, or admin');
    process.exit(1);
  }

  console.log(`\n🧪 KYC Testing Examples for ${userRole.toUpperCase()} role`);
  console.log('='.repeat(50));

  await runKycTests(userRole);
};

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  registerTestUser,
  loginUser,
  getKycStatus,
  testTier1Verification,
  testTier3Verification,
  displayTestData,
  runKycTests
};
