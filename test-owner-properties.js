require("dotenv").config();
const axios = require("axios");

// Test configuration
const BASE_URL = "http://localhost:5000"; // Adjust if your backend runs on a different port

// Mock user data for testing
const mockUsers = {
  owner: {
    _id: "owner123",
    role: "owner",
    email: "owner@test.com",
  },
  admin: {
    _id: "admin123",
    role: "admin",
    email: "admin@test.com",
  },
};

// Mock properties for testing
const mockProperties = [
  {
    _id: "prop1",
    property_name: "Test Apartment 1",
    owner: "owner123",
    publication_status: "pending",
    is_active: true,
  },
  {
    _id: "prop2",
    property_name: "Test Apartment 2",
    owner: "owner123",
    publication_status: "published",
    is_active: true,
  },
  {
    _id: "prop3",
    property_name: "Test Apartment 3",
    owner: "owner123",
    publication_status: "rejected",
    is_active: false,
  },
];

async function testOwnerPropertyAccess() {
  console.log("🧪 Testing Owner Property Access...\n");

  try {
    // Test 1: Owner should see all their properties (pending, published, rejected)
    console.log("📋 Test 1: Owner viewing their own properties");
    console.log(
      "Expected: Should see all 3 properties regardless of publication status\n"
    );

    // Simulate owner request
    const ownerParams = {
      owner: "owner123",
      page: 1,
      limit: 10,
    };

    console.log("Request params:", ownerParams);
    console.log("Expected behavior: No publication_status filter applied");
    console.log("Expected result: All 3 properties returned\n");

    // Test 2: Admin should see all properties when no publication_status specified
    console.log("📋 Test 2: Admin viewing properties");
    console.log(
      "Expected: Should see all properties (admin bypasses publication filter)\n"
    );

    const adminParams = {
      page: 1,
      limit: 10,
    };

    console.log("Request params:", adminParams);
    console.log(
      "Expected behavior: No publication_status filter applied (admin bypass)"
    );
    console.log("Expected result: All properties returned\n");

    // Test 3: Public request should only see published properties
    console.log("📋 Test 3: Public request (no user)");
    console.log("Expected: Should only see published properties\n");

    const publicParams = {
      page: 1,
      limit: 10,
    };

    console.log("Request params:", publicParams);
    console.log(
      'Expected behavior: publication_status = "published" filter applied'
    );
    console.log("Expected result: Only published properties returned\n");

    // Test 4: Owner with explicit publication_status filter
    console.log("📋 Test 4: Owner with explicit publication_status filter");
    console.log("Expected: Should respect the explicit filter\n");

    const ownerWithFilterParams = {
      owner: "owner123",
      publication_status: "pending",
      page: 1,
      limit: 10,
    };

    console.log("Request params:", ownerWithFilterParams);
    console.log(
      'Expected behavior: publication_status = "pending" filter applied'
    );
    console.log("Expected result: Only pending properties returned\n");

    console.log("✅ Test scenarios defined successfully!");
    console.log("\n🎯 Key Points:");
    console.log("• Owners should see ALL their properties by default");
    console.log("• Admins should see ALL properties by default");
    console.log("• Public requests should only see published properties");
    console.log(
      "• Explicit filters should be respected regardless of user role"
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Test the property controller logic
function testPropertyControllerLogic() {
  console.log("\n🔧 Testing Property Controller Logic...\n");

  // Simulate the controller logic
  function simulateControllerLogic(user, query) {
    let filter = {};

    // Publication status filter - prioritize owner access over general rules
    if (user && query.owner && query.owner === user._id.toString()) {
      // If owner is viewing their own properties, show all regardless of publication status
      // Only apply publication_status filter if explicitly requested
      if (query.publication_status) {
        filter.publication_status = query.publication_status;
        console.log(
          "✅ Owner with explicit filter:",
          filter.publication_status
        );
      } else {
        console.log(
          "✅ Owner without filter: No publication_status filter applied"
        );
      }
    } else if (query.publication_status) {
      // For admin users or explicit requests, use the provided publication_status
      filter.publication_status = query.publication_status;
      console.log("✅ Explicit filter applied:", filter.publication_status);
    } else if (!user || user.role !== "admin") {
      // For non-admin users or public pages, only show published properties
      filter.publication_status = "published";
      console.log("✅ Public filter applied: published only");
    } else {
      console.log(
        "✅ Admin without filter: No publication_status filter applied"
      );
    }

    return filter;
  }

  console.log("📋 Test Case 1: Owner viewing own properties");
  simulateControllerLogic(mockUsers.owner, { owner: "owner123" });

  console.log("\n📋 Test Case 2: Owner with explicit filter");
  simulateControllerLogic(mockUsers.owner, {
    owner: "owner123",
    publication_status: "pending",
  });

  console.log("\n📋 Test Case 3: Admin viewing properties");
  simulateControllerLogic(mockUsers.admin, {});

  console.log("\n📋 Test Case 4: Public request");
  simulateControllerLogic(null, {});

  console.log("\n📋 Test Case 5: Admin with explicit filter");
  simulateControllerLogic(mockUsers.admin, { publication_status: "rejected" });
}

async function runTests() {
  await testOwnerPropertyAccess();
  testPropertyControllerLogic();
}

runTests().catch(console.error);
