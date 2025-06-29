/**
 * Validation script to test KYC query logic without making actual database calls
 * This helps verify the query building logic is correct
 */

function buildKycQuery(tier, search, status) {
  let query = {};

  // Build the base query based on status filter
  if (status === "verified") {
    query.$or = [
      { "kyc.tier1.status": "verified" },
      { "kyc.tier2.status": "verified" },
      { "kyc.tier3.status": "verified" },
    ];
  } else if (status === "pending") {
    query.$or = [
      { "kyc.tier1.status": "pending" },
      { "kyc.tier2.status": "pending" },
      { "kyc.tier3.status": "pending" },
    ];
  } else if (status === "rejected") {
    query.$or = [
      { "kyc.tier1.status": "rejected" },
      { "kyc.tier2.status": "rejected" },
      { "kyc.tier3.status": "rejected" },
    ];
  } else {
    // For "all" status, show users who have any KYC data
    query.$or = [
      { "kyc.tier1": { $exists: true } },
      { "kyc.tier2": { $exists: true } },
      { "kyc.tier3": { $exists: true } },
    ];
  }

  // Refine query based on specific tier
  if (tier === "1") {
    if (status && status !== "all") {
      query = { "kyc.tier1.status": status };
    } else {
      query = { "kyc.tier1": { $exists: true } };
    }
  } else if (tier === "2") {
    if (status && status !== "all") {
      query = { "kyc.tier2.status": status };
    } else {
      query = { "kyc.tier2": { $exists: true } };
    }
  } else if (tier === "3") {
    if (status && status !== "all") {
      query = { "kyc.tier3.status": status };
    } else {
      query = { "kyc.tier3": { $exists: true } };
    }
  }

  // Add search functionality
  if (search) {
    const searchQuery = {
      $or: [
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { short_id: { $regex: search, $options: "i" } },
        { phone_number: { $regex: search, $options: "i" } },
      ],
    };

    // Combine existing filters with search filter using $and
    query = {
      $and: [query, searchQuery],
    };
  }

  return query;
}

// Test cases
const testCases = [
  {
    name: "All KYC records",
    params: { tier: null, search: null, status: "all" },
    expected: "Should return users with any KYC data"
  },
  {
    name: "Pending KYC records",
    params: { tier: null, search: null, status: "pending" },
    expected: "Should return users with any pending tier"
  },
  {
    name: "Verified KYC records",
    params: { tier: null, search: null, status: "verified" },
    expected: "Should return users with any verified tier"
  },
  {
    name: "Tier 1 pending",
    params: { tier: "1", search: null, status: "pending" },
    expected: "Should return users with tier1 status = pending"
  },
  {
    name: "Tier 2 all",
    params: { tier: "2", search: null, status: "all" },
    expected: "Should return users with tier2 data (any status)"
  },
  {
    name: "Search only",
    params: { tier: null, search: "john", status: "all" },
    expected: "Should search across name/email fields with KYC existence check"
  },
  {
    name: "Complex filter",
    params: { tier: "1", search: "test", status: "verified" },
    expected: "Should combine tier1 verified with search"
  }
];

function validateQueries() {
  console.log("🔍 Validating KYC Query Logic\n");

  testCases.forEach((testCase, index) => {
    console.log(`${index + 1}. ${testCase.name}`);
    console.log(`   Parameters: ${JSON.stringify(testCase.params)}`);
    
    const query = buildKycQuery(
      testCase.params.tier,
      testCase.params.search,
      testCase.params.status
    );
    
    console.log(`   Generated Query: ${JSON.stringify(query, null, 2)}`);
    console.log(`   Expected: ${testCase.expected}`);
    
    // Basic validation
    if (testCase.params.search && !query.$and) {
      console.log("   ⚠️  Warning: Search parameter provided but no $and in query");
    }
    
    if (testCase.params.tier && testCase.params.status !== "all") {
      const expectedField = `kyc.tier${testCase.params.tier}.status`;
      const hasExpectedField = JSON.stringify(query).includes(expectedField);
      if (!hasExpectedField) {
        console.log(`   ⚠️  Warning: Expected field ${expectedField} not found in query`);
      }
    }
    
    console.log("   ✅ Query generated successfully\n");
  });

  console.log("🎉 Query validation completed!");
}

// Additional helper function to test query performance
function analyzeQueryComplexity(query) {
  let complexity = 0;
  
  if (query.$and) complexity += 2;
  if (query.$or) complexity += query.$or.length;
  if (query.$regex) complexity += 1;
  
  return {
    complexity,
    hasTextSearch: JSON.stringify(query).includes('$regex'),
    hasCompoundConditions: !!query.$and,
    hasOrConditions: !!query.$or
  };
}

// Run validation
if (require.main === module) {
  validateQueries();
  
  console.log("\n📊 Query Complexity Analysis:");
  testCases.forEach((testCase, index) => {
    const query = buildKycQuery(
      testCase.params.tier,
      testCase.params.search,
      testCase.params.status
    );
    const analysis = analyzeQueryComplexity(query);
    console.log(`${index + 1}. ${testCase.name}: Complexity ${analysis.complexity}, Text Search: ${analysis.hasTextSearch}`);
  });
}

module.exports = { buildKycQuery, validateQueries, analyzeQueryComplexity };
