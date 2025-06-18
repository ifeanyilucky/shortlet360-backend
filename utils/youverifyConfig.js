/**
 * YouVerify Configuration Utility
 * Manages environment-specific settings and test data for YouVerify API integration
 */

const { BadRequestError } = require("../errors");

/**
 * Environment configuration for YouVerify
 */
const YOUVERIFY_CONFIG = {
  sandbox: {
    baseURL: "https://api.sandbox.youverify.co",
    environment: "sandbox",
    description: "Sandbox environment for testing and development"
  },
  production: {
    baseURL: "https://api.youverify.co", 
    environment: "production",
    description: "Production environment for live operations"
  }
};

/**
 * Get current YouVerify environment configuration
 * @returns {Object} Environment configuration
 */
const getCurrentEnvironment = () => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const youverifyBaseUrl = process.env.YOUVERIFY_BASE_URL;
  
  // Determine environment based on base URL or NODE_ENV
  if (youverifyBaseUrl && youverifyBaseUrl.includes("sandbox")) {
    return YOUVERIFY_CONFIG.sandbox;
  } else if (youverifyBaseUrl && youverifyBaseUrl.includes("api.youverify.co")) {
    return YOUVERIFY_CONFIG.production;
  } else if (nodeEnv === "production") {
    return YOUVERIFY_CONFIG.production;
  } else {
    return YOUVERIFY_CONFIG.sandbox;
  }
};

/**
 * Check if current environment is sandbox
 * @returns {boolean} True if sandbox environment
 */
const isSandboxEnvironment = () => {
  const currentEnv = getCurrentEnvironment();
  return currentEnv.environment === "sandbox";
};

/**
 * Check if current environment is production
 * @returns {boolean} True if production environment
 */
const isProductionEnvironment = () => {
  const currentEnv = getCurrentEnvironment();
  return currentEnv.environment === "production";
};

/**
 * Get environment-appropriate test data
 * @param {string} dataType - Type of test data needed
 * @returns {Object|null} Test data or null if production
 */
const getTestData = (dataType) => {
  if (isProductionEnvironment()) {
    return null; // No test data in production
  }

  const testData = {
    phone_numbers: {
      valid: ["08000000000", "08111111111", "08222222222", "07000000000", "09000000000"],
      invalid: ["08000000001", "00000000000"]
    },
    nins: {
      valid: ["11111111111", "22222222222", "33333333333"],
      invalid: ["00000000000", "99999999999"]
    },
    bvns: {
      valid: ["11111111111", "22222222222"],
      invalid: ["00000000000"]
    },
    bank_accounts: {
      valid: [
        { account_number: "1000000000", bank_code: "058", bank_name: "Guaranty Trust Bank" },
        { account_number: "2000000000", bank_code: "011", bank_name: "First Bank of Nigeria" },
        { account_number: "3000000000", bank_code: "033", bank_name: "United Bank for Africa" }
      ],
      invalid: [
        { account_number: "1111111111", bank_code: "058", bank_name: "Guaranty Trust Bank" }
      ]
    },
    businesses: {
      valid: [
        { rc_number: "RC0000000", business_name: "Test Company Limited", business_type: "company" },
        { rc_number: "BN0000000", business_name: "Test Business Enterprise", business_type: "business" }
      ],
      invalid: [
        { rc_number: "RC11111111", business_name: "Invalid Company", business_type: "company" }
      ]
    }
  };

  return dataType ? testData[dataType] : testData;
};

/**
 * Validate environment configuration
 * @throws {BadRequestError} If configuration is invalid
 */
const validateEnvironmentConfig = () => {
  const requiredEnvVars = ["YOUVERIFY_API_TOKEN"];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new BadRequestError(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  const currentEnv = getCurrentEnvironment();
  const baseUrl = process.env.YOUVERIFY_BASE_URL || currentEnv.baseURL;
  
  if (!baseUrl) {
    throw new BadRequestError("YouVerify base URL not configured");
  }

  return {
    isValid: true,
    environment: currentEnv.environment,
    baseURL: baseUrl,
    hasApiToken: !!process.env.YOUVERIFY_API_TOKEN
  };
};

/**
 * Get recommended test scenario for a specific verification type
 * @param {string} verificationType - Type of verification (tier1, tier3, etc.)
 * @param {string} scenario - Scenario type (success, failure, etc.)
 * @returns {Object|null} Test scenario data
 */
const getTestScenario = (verificationType, scenario = "success") => {
  if (isProductionEnvironment()) {
    return null;
  }

  const scenarios = {
    tier1: {
      success: {
        phone_number: "08000000000",
        nin: "11111111111",
        expected_result: "verified"
      },
      phone_failure: {
        phone_number: "08000000001", 
        nin: "11111111111",
        expected_result: "phone_verification_failed"
      },
      nin_failure: {
        phone_number: "08000000000",
        nin: "00000000000", 
        expected_result: "nin_verification_failed"
      }
    },
    tier3: {
      success: {
        bvn: "11111111111",
        account_number: "1000000000",
        bank_code: "058",
        business_name: "Test Company Limited",
        rc_number: "RC0000000",
        expected_result: "verified"
      },
      bvn_failure: {
        bvn: "00000000000",
        account_number: "1000000000",
        bank_code: "058",
        expected_result: "bvn_verification_failed"
      },
      bank_failure: {
        bvn: "11111111111", 
        account_number: "1111111111",
        bank_code: "058",
        expected_result: "bank_verification_failed"
      }
    }
  };

  return scenarios[verificationType]?.[scenario] || null;
};

/**
 * Log environment information for debugging
 */
const logEnvironmentInfo = () => {
  const currentEnv = getCurrentEnvironment();
  const config = validateEnvironmentConfig();
  
  console.log("=== YouVerify Environment Configuration ===");
  console.log(`Environment: ${currentEnv.environment}`);
  console.log(`Base URL: ${config.baseURL}`);
  console.log(`API Token Configured: ${config.hasApiToken ? "Yes" : "No"}`);
  console.log(`Test Data Available: ${isSandboxEnvironment() ? "Yes" : "No"}`);
  console.log("============================================");
};

/**
 * Get bank codes for testing
 * @returns {Object} Bank codes and names
 */
const getBankCodes = () => {
  return {
    "058": "Guaranty Trust Bank",
    "011": "First Bank of Nigeria", 
    "033": "United Bank for Africa",
    "044": "Access Bank",
    "057": "Zenith Bank",
    "070": "Fidelity Bank",
    "221": "Stanbic IBTC Bank",
    "214": "First City Monument Bank",
    "232": "Sterling Bank",
    "082": "Keystone Bank"
  };
};

module.exports = {
  YOUVERIFY_CONFIG,
  getCurrentEnvironment,
  isSandboxEnvironment,
  isProductionEnvironment,
  getTestData,
  validateEnvironmentConfig,
  getTestScenario,
  logEnvironmentInfo,
  getBankCodes
};
