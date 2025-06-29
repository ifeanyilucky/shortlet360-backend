const axios = require('axios');

// Test script to verify KYC filtering functionality
const BASE_URL = 'http://localhost:5000/api/admin';

// Test cases for KYC filtering
const testCases = [
  {
    name: 'Get all KYC records',
    endpoint: '/kyc/all',
    params: {}
  },
  {
    name: 'Get pending KYC records',
    endpoint: '/kyc/all',
    params: { status: 'pending' }
  },
  {
    name: 'Get verified KYC records',
    endpoint: '/kyc/all',
    params: { status: 'verified' }
  },
  {
    name: 'Get rejected KYC records',
    endpoint: '/kyc/all',
    params: { status: 'rejected' }
  },
  {
    name: 'Get Tier 1 pending records',
    endpoint: '/kyc/all',
    params: { tier: '1', status: 'pending' }
  },
  {
    name: 'Get Tier 2 verified records',
    endpoint: '/kyc/all',
    params: { tier: '2', status: 'verified' }
  },
  {
    name: 'Get Tier 3 all records',
    endpoint: '/kyc/all',
    params: { tier: '3' }
  },
  {
    name: 'Search by email',
    endpoint: '/kyc/all',
    params: { search: 'test@example.com' }
  },
  {
    name: 'Search by name',
    endpoint: '/kyc/all',
    params: { search: 'john' }
  },
  {
    name: 'Complex filter: Tier 1 pending with search',
    endpoint: '/kyc/all',
    params: { tier: '1', status: 'pending', search: 'user' }
  }
];

async function runTests() {
  console.log('🧪 Testing KYC Filtering Functionality\n');
  
  for (const testCase of testCases) {
    try {
      console.log(`📋 ${testCase.name}`);
      
      const queryParams = new URLSearchParams(testCase.params).toString();
      const url = `${BASE_URL}${testCase.endpoint}${queryParams ? `?${queryParams}` : ''}`;
      
      console.log(`   URL: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE' // Replace with actual admin token
        }
      });
      
      const { users, pagination } = response.data;
      
      console.log(`   ✅ Success: Found ${users.length} users (Total: ${pagination.total})`);
      
      // Log first user for verification
      if (users.length > 0) {
        const firstUser = users[0];
        console.log(`   👤 Sample user: ${firstUser.first_name} ${firstUser.last_name} (${firstUser.email})`);
        
        // Log KYC status
        if (firstUser.kyc) {
          const tier1Status = firstUser.kyc.tier1?.status || 'not started';
          const tier2Status = firstUser.kyc.tier2?.status || 'not started';
          const tier3Status = firstUser.kyc.tier3?.status || 'not started';
          console.log(`   🔐 KYC Status: T1:${tier1Status}, T2:${tier2Status}, T3:${tier3Status}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.status === 401) {
        console.log('   🔑 Note: Please update the Authorization token in the script');
      }
    }
    
    console.log(''); // Empty line for readability
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
