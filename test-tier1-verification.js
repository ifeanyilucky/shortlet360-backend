const axios = require("axios");

// Test configuration
const BASE_URL = "http://localhost:5000"; // Adjust if your backend runs on a different port
const TEST_PHONE = "08000000000"; // YouVerify sandbox test phone
const TEST_NIN = "11111111111"; // YouVerify sandbox test NIN

// You'll need to get a valid JWT token for testing
const TEST_TOKEN = "YOUR_JWT_TOKEN_HERE"; // Replace with actual token

async function testTier1Verification() {
  try {
    console.log("🧪 Testing Tier 1 Verification...");
    console.log("📞 Test Phone:", TEST_PHONE);
    console.log("🆔 Test NIN:", TEST_NIN);

    const response = await axios.post(
      `${BASE_URL}/api/kyc/tier1/submit`,
      {
        phone_number: TEST_PHONE,
        nin: TEST_NIN,
      },
      {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Tier 1 Verification Test PASSED");
    console.log("📊 Response:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("❌ Tier 1 Verification Test FAILED");
    console.error("🔍 Error Details:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });
  }
}

async function testPhoneNumberValidation() {
  console.log("\n🧪 Testing Phone Number Validation...");

  const testCases = [
    { phone: "08000000000", expected: "valid" },
    { phone: "+2348000000000", expected: "valid" },
    { phone: "2348000000000", expected: "valid" },
    { phone: "8000000000", expected: "valid" },
    { phone: "1234567890", expected: "invalid" },
    { phone: "", expected: "invalid" },
    { phone: null, expected: "invalid" },
    { phone: undefined, expected: "invalid" },
  ];

  for (const testCase of testCases) {
    try {
      console.log(
        `📞 Testing: "${testCase.phone}" (expected: ${testCase.expected})`
      );

      // This would test the validation logic
      const cleanPhone = String(testCase.phone || "").trim();
      const isValid =
        cleanPhone &&
        (cleanPhone.startsWith("+234") ||
          cleanPhone.startsWith("234") ||
          (cleanPhone.startsWith("0") && cleanPhone.length === 11) ||
          (cleanPhone.length === 10 && /^[789][01]\d{8}$/.test(cleanPhone)));

      const result = isValid ? "valid" : "invalid";
      const status = result === testCase.expected ? "✅ PASS" : "❌ FAIL";

      console.log(`   ${status}: ${result}`);
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }
}

async function testNINValidation() {
  console.log("\n🧪 Testing NIN Validation...");

  const testCases = [
    { nin: "11111111111", expected: "valid" },
    { nin: "12345678901", expected: "valid" },
    { nin: "1234567890", expected: "invalid" }, // Too short
    { nin: "123456789012", expected: "invalid" }, // Too long
    { nin: "1234567890a", expected: "invalid" }, // Contains letter
    { nin: "", expected: "invalid" },
    { nin: null, expected: "invalid" },
    { nin: undefined, expected: "invalid" },
  ];

  for (const testCase of testCases) {
    try {
      console.log(
        `🆔 Testing: "${testCase.nin}" (expected: ${testCase.expected})`
      );

      const cleanNIN = String(testCase.nin || "").replace(/\D/g, "");
      const isValid = cleanNIN.length === 11;

      const result = isValid ? "valid" : "invalid";
      const status = result === testCase.expected ? "✅ PASS" : "❌ FAIL";

      console.log(`   ${status}: ${result}`);
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }
}

// Run tests
async function runTests() {
  console.log("🚀 Starting Tier 1 Verification Tests...\n");

  await testPhoneNumberValidation();
  await testNINValidation();

  console.log("\n📝 Note: To test the actual API endpoint, you need to:");
  console.log("1. Start your backend server");
  console.log("2. Get a valid JWT token from a logged-in user");
  console.log("3. Replace TEST_TOKEN in this file");
  console.log("4. Uncomment the testTier1Verification() call below");

  // Uncomment the line below to test the actual API endpoint
  // await testTier1Verification();
}

runTests().catch(console.error);
