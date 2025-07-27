require("dotenv").config();
const axios = require("axios");

// Test YouVerify configuration
async function testYouVerifyConfig() {
  console.log("🧪 Testing YouVerify Configuration...\n");

  // Check environment variables
  console.log("📋 Environment Variables:");
  console.log(
    "YOUVERIFY_BASE_URL:",
    process.env.YOUVERIFY_BASE_URL || "NOT_SET"
  );
  console.log(
    "YOUVERIFY_API_TOKEN:",
    process.env.YOUVERIFY_API_TOKEN ? "***SET***" : "NOT_SET"
  );
  console.log("NODE_ENV:", process.env.NODE_ENV || "NOT_SET");
  console.log("");

  // Test API connectivity
  const baseURL =
    process.env.YOUVERIFY_BASE_URL || "https://api.sandbox.youverify.co/v2/api";
  const apiToken = process.env.YOUVERIFY_API_TOKEN;

  if (!apiToken) {
    console.error("❌ YOUVERIFY_API_TOKEN is not set!");
    return;
  }

  console.log("🌐 Testing API Connectivity...");
  console.log("Base URL:", baseURL);

  try {
    // Test with a simple phone verification request
    const testPhone = "08000000000"; // YouVerify sandbox test phone

    console.log("📞 Testing phone verification with:", testPhone);

    const response = await axios.post(
      `${baseURL}/identity/ng/phone`,
      {
        mobile: testPhone,
        isSubjectConsent: true,
      },
      {
        headers: {
          "Content-Type": "application/json",
          token: apiToken,
        },
        timeout: 10000,
      }
    );

    console.log("✅ API Connection Successful!");
    console.log("📊 Response Status:", response.status);
    console.log("📊 Response Data:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("❌ API Connection Failed!");
    console.error("🔍 Error Details:");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
      console.error("Data:", error.response.data);
    } else if (error.request) {
      console.error("Request Error:", error.request);
    } else {
      console.error("Error:", error.message);
    }
  }
}

// Test phone number formatting
function testPhoneNumberFormatting() {
  console.log("\n📱 Testing Phone Number Formatting...\n");

  const testCases = [
    "08000000000",
    "+2348000000000",
    "2348000000000",
    "8000000000",
    "08012345678",
    "+2348012345678",
  ];

  testCases.forEach((phone) => {
    console.log(`Testing: "${phone}"`);

    // Clean the phone number
    let digitsOnly = phone.replace(/\D/g, "");

    // Remove country code if present
    if (digitsOnly.startsWith("234")) {
      digitsOnly = digitsOnly.substring(3);
    }

    // Remove leading 0
    if (digitsOnly.startsWith("0")) {
      digitsOnly = digitsOnly.substring(1);
    }

    // Validate format
    const isValid =
      digitsOnly.length === 10 && /^[789][01]\d{8}$/.test(digitsOnly);
    const formatted = `0${digitsOnly}`;

    console.log(`  Cleaned: ${digitsOnly}`);
    console.log(`  Valid: ${isValid ? "✅" : "❌"}`);
    console.log(`  Formatted: ${formatted}`);
    console.log("");
  });
}

// Run tests
async function runTests() {
  await testYouVerifyConfig();
  testPhoneNumberFormatting();
}

runTests().catch(console.error);
