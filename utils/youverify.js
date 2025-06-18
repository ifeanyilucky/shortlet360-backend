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

// Create YouVerify API client with environment-specific configuration
const YouVerify = axios.create({
  baseURL: process.env.YOUVERIFY_BASE_URL || `${currentEnv.baseURL}/v2/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Verify phone number using YouVerify API
 * @param {string} phoneNumber - Phone number to verify
 * @returns {Promise<Object>} - Verification result
 */
const verifyPhoneNumber = async (phoneNumber) => {
  try {
    if (!phoneNumber) throw new BadRequestError("Phone number is required");

    // Format phone number to ensure it's exactly 11 digits (YouVerify requirement)
    // Remove any non-digit characters
    let digitsOnly = phoneNumber.replace(/\D/g, "");

    // If it starts with country code (e.g., 234), remove it to get 10 digits
    if (digitsOnly.startsWith("234")) {
      digitsOnly = digitsOnly.substring(3);
    }

    // If it starts with 0, remove it
    if (digitsOnly.startsWith("0")) {
      digitsOnly = digitsOnly.substring(1);
    }

    // Ensure it's 10 digits (without leading 0) and add 0 at the beginning to make it 11 digits
    const formattedPhone =
      digitsOnly.length === 10 ? `0${digitsOnly}` : digitsOnly;

    // Validate that we have exactly 11 digits
    if (formattedPhone.length !== 11) {
      throw new BadRequestError(
        "Phone number must be 11 digits (e.g., 08012345678)"
      );
    }

    const response = await YouVerify.post(
      "/identity/ng/phone",
      {
        mobile: formattedPhone,
        isSubjectConsent: true,
      },
      {
        headers: {
          token: process.env.YOUVERIFY_API_TOKEN,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Phone verification error:",
      error.response?.data || error.message
    );
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

    // Prepare request payload
    const payload = {
      id: nin,
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

    const response = await YouVerify.post("/identity/ng/nin", payload, {
      headers: {
        token: process.env.YOUVERIFY_API_TOKEN,
      },
    });

    return response.data;
  } catch (error) {
    console.error(
      "NIN verification error:",
      error.response?.data || error.message
    );
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
