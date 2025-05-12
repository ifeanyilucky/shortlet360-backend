const axios = require("axios");
const { BadRequestError } = require("../errors");

// Create Prembly API client
const Prembly = axios.create({
  baseURL: "https://api.prembly.com/identitypass/v2",
  headers: {
    "x-api-key": process.env.PREMBLY_API_KEY,
    "app-id": process.env.PREMBLY_APP_ID,
    "Content-Type": "application/json",
  },
});

/**
 * Verify NIN using Prembly API
 * @param {string} nin - National Identification Number
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {Promise<Object>} - Verification result
 */
const verifyNIN = async (nin, firstName, lastName) => {
  try {
    if (!nin) throw new BadRequestError("NIN is required");
    if (!firstName) throw new BadRequestError("First name is required");
    if (!lastName) throw new BadRequestError("Last name is required");

    console.log(`Verifying NIN for ${firstName} ${lastName}`);

    const response = await Prembly.post("/biometrics/merchant/data/verification/nin_wo_face", {
      number: nin,
      first_name: firstName,
      last_name: lastName,
    });

    return response.data;
  } catch (error) {
    console.error("NIN verification error:", error.response?.data || error.message);
    if (error.response?.data) {
      throw new BadRequestError(error.response.data.message || "NIN verification failed");
    }
    throw new BadRequestError("NIN verification service unavailable");
  }
};

/**
 * Verify phone number using Prembly API
 * @param {string} phoneNumber - Phone number to verify
 * @returns {Promise<Object>} - Verification result
 */
const verifyPhoneNumber = async (phoneNumber) => {
  try {
    if (!phoneNumber) throw new BadRequestError("Phone number is required");

    // Format phone number to ensure it starts with country code
    const formattedPhone = phoneNumber.startsWith("+") 
      ? phoneNumber 
      : phoneNumber.startsWith("0") 
        ? `+234${phoneNumber.substring(1)}` 
        : `+234${phoneNumber}`;

    const response = await Prembly.post("/biometrics/merchant/data/verification/phone_number", {
      number: formattedPhone,
    });

    return response.data;
  } catch (error) {
    console.error("Phone verification error:", error.response?.data || error.message);
    if (error.response?.data) {
      throw new BadRequestError(error.response.data.message || "Phone verification failed");
    }
    throw new BadRequestError("Phone verification service unavailable");
  }
};

/**
 * Verify address using Prembly API
 * @param {Object} addressData - Address data
 * @returns {Promise<Object>} - Verification result
 */
const verifyAddress = async (addressData) => {
  try {
    const { street, city, state, postalCode } = addressData;
    
    if (!street) throw new BadRequestError("Street address is required");
    if (!city) throw new BadRequestError("City is required");
    if (!state) throw new BadRequestError("State is required");

    // This is a placeholder - Prembly doesn't have a direct address verification endpoint
    // You might need to use a different service or implement manual verification
    
    // For now, we'll return a mock successful response
    return {
      status: true,
      detail: "Address verification initiated",
      message: "Address verification request has been received and will be processed",
      data: {
        reference: `ADDR-${Date.now()}`,
        status: "pending",
      }
    };
  } catch (error) {
    console.error("Address verification error:", error.response?.data || error.message);
    if (error.response?.data) {
      throw new BadRequestError(error.response.data.message || "Address verification failed");
    }
    throw new BadRequestError("Address verification service unavailable");
  }
};

/**
 * Verify bank statement using Prembly API
 * @param {Object} bankData - Bank statement data
 * @param {string} documentUrl - URL to the bank statement document
 * @returns {Promise<Object>} - Verification result
 */
const verifyBankStatement = async (bankData, documentUrl) => {
  try {
    const { bankName, accountNumber } = bankData;
    
    if (!bankName) throw new BadRequestError("Bank name is required");
    if (!accountNumber) throw new BadRequestError("Account number is required");
    if (!documentUrl) throw new BadRequestError("Bank statement document is required");

    // This is a placeholder - Prembly doesn't have a direct bank statement verification endpoint
    // You might need to use a different service or implement manual verification
    
    // For now, we'll return a mock successful response
    return {
      status: true,
      detail: "Bank statement verification initiated",
      message: "Bank statement verification request has been received and will be processed",
      data: {
        reference: `BANK-${Date.now()}`,
        status: "pending",
      }
    };
  } catch (error) {
    console.error("Bank verification error:", error.response?.data || error.message);
    if (error.response?.data) {
      throw new BadRequestError(error.response.data.message || "Bank verification failed");
    }
    throw new BadRequestError("Bank verification service unavailable");
  }
};

module.exports = {
  verifyNIN,
  verifyPhoneNumber,
  verifyAddress,
  verifyBankStatement,
};
