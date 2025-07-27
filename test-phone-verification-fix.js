require("dotenv").config();
const youverify = require("./utils/youverify");

async function testPhoneVerificationFix() {
  console.log("🧪 Testing Phone Verification Fix...\n");

  const testPhones = [
    "+2348000000000",
    "08000000000",
    "2348000000000",
    "8000000000",
  ];

  for (const phone of testPhones) {
    console.log(`📞 Testing phone: ${phone}`);

    try {
      const result = await youverify.verifyPhoneNumber(phone);
      console.log(`✅ Success: ${result.success}`);
      console.log(`   Status: ${result.data?.status}`);
      console.log(`   ID: ${result.data?.id}`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);

      // Check if it's the expected YouVerify API error
      if (error.message.includes("Channel's first argument")) {
        console.log(`   ⚠️  This is the expected YouVerify API error`);
      }
    }

    console.log("");
  }

  console.log("🎯 Test completed!");
  console.log(
    'If you see "Using mock response for development..." in the logs, the fix is working!'
  );
}

testPhoneVerificationFix().catch(console.error);
