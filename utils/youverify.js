const axios = require("axios");
const { BadRequestError } = require("../errors");
const {
  getCurrentEnvironment,
  validateEnvironmentConfig,
} = require("./youverifyConfig");

// Validate environment configuration on startup
try {
  validateEnvironmentConfig();
} catch (error) {
  console.error("YouVerify configuration error:", error.message);
}

// Get current environment configuration
const currentEnv = getCurrentEnvironment();

// Log configuration for debugging
console.log("YouVerify Configuration:", {
  baseURL: process.env.YOUVERIFY_BASE_URL || `${currentEnv.baseURL}/v2/api`,
  environment: currentEnv.environment,
  hasApiToken: !!process.env.YOUVERIFY_API_TOKEN,
  apiTokenLength: process.env.YOUVERIFY_API_TOKEN
    ? process.env.YOUVERIFY_API_TOKEN.length
    : 0,
});

// Create YouVerify API client with environment-specific configuration
const YouVerify = axios.create({
  baseURL: process.env.YOUVERIFY_BASE_URL || `${currentEnv.baseURL}/v2/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout
});

/**
 * Verify phone number using YouVerify API
 * @param {string} phoneNumber - Phone number to verify
 * @returns {Promise<Object>} - Verification result
 */
const verifyPhoneNumber = async (phoneNumber) => {
  try {
    if (!phoneNumber) throw new BadRequestError("Phone number is required");

    // Ensure phoneNumber is a string
    const phoneString = String(phoneNumber).trim();

    if (!phoneString) {
      throw new BadRequestError("Phone number cannot be empty");
    }

    // Format phone number according to YouVerify requirements
    // Remove any non-digit characters
    let digitsOnly = phoneString.replace(/\D/g, "");

    // If it starts with country code (e.g., 234), remove it to get 10 digits
    if (digitsOnly.startsWith("234")) {
      digitsOnly = digitsOnly.substring(3);
    }

    // If it starts with 0, remove it to get 10 digits
    if (digitsOnly.startsWith("0")) {
      digitsOnly = digitsOnly.substring(1);
    }

    // Ensure it's exactly 10 digits (without leading 0)
    if (digitsOnly.length !== 10) {
      throw new BadRequestError(
        "Phone number must be 10 digits after removing country code and leading zero (e.g., 8012345678)"
      );
    }

    // Validate Nigerian phone number format (10 digits starting with 7, 8, or 9)
    const nigerianPhoneRegex = /^[789][01]\d{8}$/;
    if (!nigerianPhoneRegex.test(digitsOnly)) {
      throw new BadRequestError(
        "Please provide a valid Nigerian phone number starting with 70, 71, 80, 81, 90, or 91"
      );
    }

    // Add leading 0 to make it 11 digits for YouVerify API
    const formattedPhone = `0${digitsOnly}`;

    console.log(`Sending phone verification request for: ${formattedPhone}`);

    // Prepare request payload according to YouVerify documentation
    const requestPayload = {
      mobile: formattedPhone,
      isSubjectConsent: true,
    };

    console.log("Request payload:", JSON.stringify(requestPayload, null, 2));
    console.log(
      "Request URL:",
      `${YouVerify.defaults.baseURL}/identity/ng/phone`
    );
    console.log("Request headers:", {
      "Content-Type": "application/json",
      token: process.env.YOUVERIFY_API_TOKEN
        ? "***TOKEN_SET***"
        : "***NO_TOKEN***",
    });

    const response = await YouVerify.post(
      "/identity/ng/phone",
      requestPayload,
      {
        headers: {
          token: process.env.YOUVERIFY_API_TOKEN,
        },
      }
    );

    console.log(`Phone verification response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Phone verification error:",
      error.response?.data || error.message
    );

    // Log the full error for debugging
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
      console.error("Response data:", error.response.data);
    }

    // Handle YouVerify API issues
    if (error.response?.data?.message?.includes("Channel's first argument")) {
      console.warn(
        "YouVerify API is experiencing issues. This appears to be a server-side problem."
      );
      console.warn("For development/testing, you can use sandbox test data.");

      // For development/testing, provide a mock response
      if (process.env.NODE_ENV !== "production") {
        console.log("Using mock response for development...");
        return {
          success: true,
          statusCode: 200,
          message: "success",
          data: {
            id: "mock-phone-verification-id",
            status: "found",
            phoneDetails: [
              {
                fullName: "TEST USER",
                dateOfBirth: "1990-01-01",
              },
            ],
            isConsent: true,
            idNumber: String(phoneNumber).replace(/\d(?=\d{4})/g, "*"),
            type: "phone",
            country: "NG",
          },
        };
      }
    }

    if (error.response?.data) {
      throw new BadRequestError(
        error.response.data.message || "Phone verification failed"
      );
    }
    throw new BadRequestError("Phone verification service unavailable");
  }
};

/**
 * Verify NIN using YouVerify API
 * @param {string} nin - National Identification Number
 * @param {string} firstName - First name (optional)
 * @param {string} lastName - Last name (optional)
 * @param {string} dateOfBirth - Date of birth in YYYY-MM-DD format (optional)
 * @returns {Promise<Object>} - Verification result
 */
const verifyNIN = async (
  nin,
  firstName = null,
  lastName = null,
  dateOfBirth = null
) => {
  try {
    if (!nin) throw new BadRequestError("NIN is required");

    // Ensure NIN is a string and clean it
    const ninString = String(nin).trim();

    if (!ninString) {
      throw new BadRequestError("NIN cannot be empty");
    }

    // Validate NIN format (11 digits)
    const ninRegex = /^\d{11}$/;
    if (!ninRegex.test(ninString)) {
      throw new BadRequestError("NIN must be exactly 11 digits");
    }

    // Prepare request payload
    const payload = {
      id: ninString,
      isSubjectConsent: true,
    };

    // Add validation data if provided
    if (firstName || lastName || dateOfBirth) {
      payload.validations = {
        data: {},
      };

      if (firstName)
        payload.validations.data.firstName = String(firstName).trim();
      if (lastName) payload.validations.data.lastName = String(lastName).trim();
      if (dateOfBirth)
        payload.validations.data.dateOfBirth = String(dateOfBirth).trim();
    }

    console.log(`Sending NIN verification request for: ${ninString}`);

    const response = await YouVerify.post("/identity/ng/nin", payload, {
      headers: {
        token: process.env.YOUVERIFY_API_TOKEN,
      },
    });

    console.log(`NIN verification response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(
      "NIN verification error:",
      error.response?.data || error.message
    );

    // Handle YouVerify API issues
    if (error.response?.data?.message?.includes("Channel's first argument")) {
      console.warn(
        "YouVerify API is experiencing issues. This appears to be a server-side problem."
      );
      console.warn("For development/testing, you can use sandbox test data.");

      // For development/testing, provide a mock response
      if (process.env.NODE_ENV !== "production") {
        console.log("Using mock response for development...");
        return {
          success: true,
          statusCode: 200,
          message: "success",
          data: {
            id: "mock-nin-verification-id",
            status: "found",
            firstName: "TEST",
            middleName: "USER",
            lastName: "NAME",
            dateOfBirth: "1990-01-01",
            gender: "Male",
            mobile: "08000000000",
            address: "123 Test Street, Lagos, Nigeria",
            birthState: "Lagos",
            birthLGA: "Lagos Island",
            birthCountry: "Nigeria",
            religion: "Christianity",
            isConsent: true,
            type: "nin",
            country: "NG",
          },
        };
      }
    }

    if (error.response?.data) {
      throw new BadRequestError(
        error.response.data.message || "NIN verification failed"
      );
    }
    throw new BadRequestError("NIN verification service unavailable");
  }
};

/**
 * Verify BVN using YouVerify API
 * @param {string} bvn - Bank Verification Number
 * @param {string} firstName - First name (optional)
 * @param {string} lastName - Last name (optional)
 * @param {string} dateOfBirth - Date of birth in YYYY-MM-DD format (optional)
 * @returns {Promise<Object>} - Verification result
 */
const verifyBVN = async (
  bvn,
  firstName = null,
  lastName = null,
  dateOfBirth = null
) => {
  try {
    if (!bvn) throw new BadRequestError("BVN is required");

    // Prepare request payload
    const payload = {
      id: bvn,
      isSubjectConsent: true,
    };

    // Add validation data if provided
    if (firstName || lastName || dateOfBirth) {
      payload.validations = {
        data: {},
      };

      if (firstName) payload.validations.data.firstName = firstName;
      if (lastName) payload.validations.data.lastName = lastName;
      if (dateOfBirth) payload.validations.data.dateOfBirth = dateOfBirth;
    }

    const response = await YouVerify.post("/identity/ng/bvn", payload, {
      headers: {
        token: process.env.YOUVERIFY_API_TOKEN,
      },
    });

    return response.data;
  } catch (error) {
    console.error(
      "BVN verification error:",
      error.response?.data || error.message
    );
    if (error.response?.data) {
      throw new BadRequestError(
        error.response.data.message || "BVN verification failed"
      );
    }
    throw new BadRequestError("BVN verification service unavailable");
  }
};

/**
 * Verify bank account using YouVerify API (Premium Bank Account Verification)
 * @param {string} accountNumber - Bank account number
 * @param {string} bankCode - Bank code
 * @returns {Promise<Object>} - Verification result
 */
const verifyBankAccount = async (accountNumber, bankCode) => {
  try {
    if (!accountNumber || !bankCode) {
      throw new BadRequestError("Account number and bank code are required");
    }

    const payload = {
      accountNumber: accountNumber,
      bankCode: bankCode,
      isSubjectConsent: true,
    };

    const response = await YouVerify.post(
      "/identity/ng/bank-account-number/resolve",
      payload,
      {
        headers: {
          token: process.env.YOUVERIFY_API_TOKEN,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Bank account verification error:",
      error.response?.data || error.message
    );
    if (error.response?.data) {
      throw new BadRequestError(
        error.response.data.message || "Bank account verification failed"
      );
    }
    throw new BadRequestError("Bank account verification service unavailable");
  }
};

/**
 * Verify business/company using YouVerify API (Global Business Verification)
 * @param {string} rcNumber - Registration certificate number (with appropriate prefix: RC, BN, IT, LP, LLP)
 * @param {string} companyName - Company name (optional, only for Nigerian companies)
 * @param {string} countryCode - Country code (default: NG for Nigeria)
 * @returns {Promise<Object>} - Verification result
 */
const verifyBusiness = async (
  rcNumber,
  companyName = null,
  countryCode = "NG"
) => {
  try {
    if (!rcNumber) throw new BadRequestError("Registration number is required");

    const payload = {
      registrationNumber: rcNumber,
      countryCode: countryCode,
      isConsent: true,
    };

    // Add company name for Nigerian companies only
    if (companyName && countryCode === "NG") {
      payload.registrationName = companyName;
    }

    const response = await YouVerify.post(
      "/verifications/global/company-advance-check",
      payload,
      {
        headers: {
          token: process.env.YOUVERIFY_API_TOKEN,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Business verification error:",
      error.response?.data || error.message
    );
    if (error.response?.data) {
      throw new BadRequestError(
        error.response.data.message || "Business verification failed"
      );
    }
    throw new BadRequestError("Business verification service unavailable");
  }
};

module.exports = {
  verifyPhoneNumber,
  verifyNIN,
  verifyBVN,
  verifyBankAccount,
  verifyBusiness,
};
