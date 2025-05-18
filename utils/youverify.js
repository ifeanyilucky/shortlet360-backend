const axios = require("axios");
const { BadRequestError } = require("../errors");

// Create YouVerify API client
const YouVerify = axios.create({
  baseURL: process.env.YOUVERIFY_BASE_URL || "https://api.youverify.co/v2/api",
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

module.exports = {
  verifyPhoneNumber,
  verifyNIN,
};
