require("dotenv").config();
const axios = require("axios");

async function testYouVerifyConnection() {
  console.log("🧪 Testing YouVerify API Connection...\n");

  const apiToken = process.env.YOUVERIFY_API_TOKEN;
  const baseURL =
    process.env.YOUVERIFY_BASE_URL || "https://api.sandbox.youverify.co/v2/api";

  if (!apiToken) {
    console.error("❌ YOUVERIFY_API_TOKEN is not set!");
    return;
  }

  console.log("🔗 Testing basic connectivity...");
  console.log("Base URL:", baseURL);
  console.log("API Token:", apiToken.substring(0, 10) + "...");
  console.log("");

  // Test 1: Basic GET request to see if the API is reachable
  try {
    console.log("📡 Test 1: Basic connectivity test...");
    const response = await axios.get(baseURL.replace("/v2/api", ""), {
      timeout: 10000,
    });
    console.log("✅ API is reachable");
    console.log("Status:", response.status);
  } catch (error) {
    console.log("❌ API is not reachable:", error.message);
  }

  console.log("");

  // Test 2: Try a different endpoint to see if it's a specific endpoint issue
  try {
    console.log("📡 Test 2: Testing NIN endpoint...");
    const response = await axios.post(
      `${baseURL}/identity/ng/nin`,
      {
        id: "11111111111",
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
    console.log("✅ NIN endpoint works");
    console.log("Response:", response.data.success);
  } catch (error) {
    console.log("❌ NIN endpoint failed:");
    if (error.response) {
      console.log("   Status:", error.response.status);
      console.log("   Message:", error.response.data?.message);
    } else {
      console.log("   Error:", error.message);
    }
  }

  console.log("");

  // Test 3: Try with a different phone number format
  try {
    console.log("📡 Test 3: Testing phone endpoint with different format...");
    const response = await axios.post(
      `${baseURL}/identity/ng/phone`,
      {
        mobile: "8012345678", // Without leading 0
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
    console.log("✅ Phone endpoint with different format works");
    console.log("Response:", response.data.success);
  } catch (error) {
    console.log("❌ Phone endpoint with different format failed:");
    if (error.response) {
      console.log("   Status:", error.response.status);
      console.log("   Message:", error.response.data?.message);
    } else {
      console.log("   Error:", error.message);
    }
  }

  console.log("");

  // Test 4: Check if it's a token issue by trying without token
  try {
    console.log("📡 Test 4: Testing without token...");
    const response = await axios.post(
      `${baseURL}/identity/ng/phone`,
      {
        mobile: "08000000000",
        isSubjectConsent: true,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );
    console.log("✅ Request without token succeeded (unexpected)");
  } catch (error) {
    console.log("❌ Request without token failed (expected):");
    if (error.response) {
      console.log("   Status:", error.response.status);
      console.log("   Message:", error.response.data?.message);
    } else {
      console.log("   Error:", error.message);
    }
  }

  console.log("");

  // Test 5: Try with a different HTTP client
  try {
    console.log("📡 Test 5: Testing with different HTTP client...");
    const https = require("https");
    const data = JSON.stringify({
      mobile: "08000000000",
      isSubjectConsent: true,
    });

    const options = {
      hostname: "api.sandbox.youverify.co",
      port: 443,
      path: "/v2/api/identity/ng/phone",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
        token: apiToken,
      },
    };

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => {
        responseData += chunk;
      });
      res.on("end", () => {
        console.log("✅ Direct HTTPS request succeeded");
        console.log("Status:", res.statusCode);
        console.log("Response:", responseData);
      });
    });

    req.on("error", (error) => {
      console.log("❌ Direct HTTPS request failed:", error.message);
    });

    req.write(data);
    req.end();
  } catch (error) {
    console.log("❌ Direct HTTPS request setup failed:", error.message);
  }
}

testYouVerifyConnection().catch(console.error);
