require("dotenv").config();
const axios = require("axios");

async function testYouVerifyToken() {
  console.log("🧪 Testing YouVerify API Token...\n");

  const apiToken = process.env.YOUVERIFY_API_TOKEN;
  const baseURL =
    process.env.YOUVERIFY_BASE_URL || "https://api.sandbox.youverify.co/v2/api";

  if (!apiToken) {
    console.error("❌ YOUVERIFY_API_TOKEN is not set!");
    return;
  }

  console.log("🔑 API Token Info:");
  console.log("Token Length:", apiToken.length);
  console.log("Token Prefix:", apiToken.substring(0, 10) + "...");
  console.log("Base URL:", baseURL);
  console.log("");

  // Test different phone numbers from YouVerify documentation
  const testPhones = [
    "08000000000", // YouVerify sandbox test phone
    "08111111111", // Alternative test phone
    "07000000000", // MTN test number
    "09000000000", // 9mobile test number
  ];

  for (const phone of testPhones) {
    console.log(`📞 Testing phone: ${phone}`);

    try {
      const response = await axios.post(
        `${baseURL}/identity/ng/phone`,
        {
          mobile: phone,
          isSubjectConsent: true,
        },
        {
          headers: {
            "Content-Type": "application/json",
            token: apiToken,
          },
          timeout: 15000,
        }
      );

      console.log(`✅ Success for ${phone}:`, response.data.success);
      if (response.data.success) {
        console.log(`   Status: ${response.data.data?.status}`);
        console.log(
          `   Phone Details: ${
            response.data.data?.phoneDetails?.length || 0
          } records found`
        );
      }
    } catch (error) {
      console.log(`❌ Failed for ${phone}:`);

      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Message: ${error.response.data?.message}`);
        console.log(`   Error Type: ${error.response.data?.name}`);
      } else if (error.request) {
        console.log(`   Network Error: ${error.message}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }

    console.log("");
  }

  // Test with different request formats
  console.log("🔧 Testing different request formats...\n");

  const testFormats = [
    {
      name: "Standard Format",
      payload: {
        mobile: "08000000000",
        isSubjectConsent: true,
      },
    },
    {
      name: "With Metadata",
      payload: {
        mobile: "08000000000",
        isSubjectConsent: true,
        metadata: {
          test: true,
          source: "test-script",
        },
      },
    },
  ];

  for (const format of testFormats) {
    console.log(`📋 Testing: ${format.name}`);

    try {
      const response = await axios.post(
        `${baseURL}/identity/ng/phone`,
        format.payload,
        {
          headers: {
            "Content-Type": "application/json",
            token: apiToken,
          },
          timeout: 15000,
        }
      );

      console.log(`✅ ${format.name} - Success:`, response.data.success);
    } catch (error) {
      console.log(
        `❌ ${format.name} - Failed:`,
        error.response?.data?.message || error.message
      );
    }

    console.log("");
  }
}

testYouVerifyToken().catch(console.error);
