require("dotenv").config();

// Mock the errors
const UnauthenticatedError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "UnauthenticatedError";
  }
};

const BadRequestError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "BadRequestError";
  }
};

// Mock the middleware function
const verifyKyc = (requiredTiers = []) => {
  return async (req, res, next) => {
    try {
      const user = req.user; // Use the user from request instead of database

      if (!user) {
        throw new UnauthenticatedError("User not found");
      }

      // Admin users bypass all KYC verification requirements
      if (user.role === "admin") {
        return next();
      }

      // If no KYC object exists, user hasn't started verification
      if (!user.kyc) {
        throw new BadRequestError(
          `KYC verification required: ${requiredTiers.join(", ")}`
        );
      }

      // Check if all required tiers are verified
      const missingTiers = [];

      for (const tier of requiredTiers) {
        if (!user.kyc[tier] || user.kyc[tier].status !== "verified") {
          missingTiers.push(tier);
        }
      }

      if (missingTiers.length > 0) {
        throw new BadRequestError(
          `KYC verification required: ${missingTiers.join(", ")}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Mock user data for testing
const mockUsers = {
  // User with no KYC
  noKyc: {
    _id: "user1",
    role: "owner",
    kyc: null,
  },

  // User with Tier 1 verified
  tier1Verified: {
    _id: "user2",
    role: "owner",
    kyc: {
      tier1: {
        status: "verified",
        phone_verified: true,
        nin_verified: true,
      },
    },
  },

  // User with Tier 1 and Tier 2 verified
  tier1And2Verified: {
    _id: "user3",
    role: "owner",
    kyc: {
      tier1: {
        status: "verified",
        phone_verified: true,
        nin_verified: true,
      },
      tier2: {
        status: "verified",
      },
    },
  },

  // User with Tier 1 pending
  tier1Pending: {
    _id: "user4",
    role: "owner",
    kyc: {
      tier1: {
        status: "pending",
        phone_verified: false,
        nin_verified: false,
      },
    },
  },

  // Admin user (should bypass KYC)
  admin: {
    _id: "admin1",
    role: "admin",
    kyc: null,
  },
};

// Test the KYC verification middleware
function testKycVerification() {
  console.log("🧪 Testing KYC Verification for Property Access...\n");

  // Test Tier 1 only verification
  const verifyTier1Only = verifyKyc(["tier1"]);

  console.log("📋 Testing Tier 1 Only Verification:");

  Object.entries(mockUsers).forEach(([userType, user]) => {
    console.log(`\n👤 Testing ${userType}:`);

    // Mock request and response objects
    const req = { user };
    const res = {};
    let nextCalled = false;
    let errorThrown = null;

    const next = (error) => {
      nextCalled = true;
      errorThrown = error;
    };

    // Call the middleware
    verifyTier1Only(req, res, next);

    // Check results
    if (user.role === "admin") {
      console.log(
        `   ✅ Admin user - Should bypass KYC: ${
          nextCalled && !errorThrown ? "PASS" : "FAIL"
        }`
      );
    } else if (!user.kyc) {
      console.log(
        `   ❌ No KYC - Should fail: ${errorThrown ? "PASS" : "FAIL"}`
      );
      if (errorThrown) {
        console.log(`      Error: ${errorThrown.message}`);
      }
    } else if (user.kyc.tier1?.status === "verified") {
      console.log(
        `   ✅ Tier 1 verified - Should pass: ${
          nextCalled && !errorThrown ? "PASS" : "FAIL"
        }`
      );
    } else {
      console.log(
        `   ❌ Tier 1 not verified - Should fail: ${
          errorThrown ? "PASS" : "FAIL"
        }`
      );
      if (errorThrown) {
        console.log(`      Error: ${errorThrown.message}`);
      }
    }
  });

  console.log("\n🎯 Expected Results:");
  console.log("✅ Admin users should bypass KYC verification");
  console.log("✅ Users with Tier 1 verified should be able to add properties");
  console.log("❌ Users with no KYC should be blocked");
  console.log("❌ Users with Tier 1 pending should be blocked");
  console.log(
    "✅ Users with Tier 1 + Tier 2 verified should be able to add properties"
  );
}

testKycVerification();
