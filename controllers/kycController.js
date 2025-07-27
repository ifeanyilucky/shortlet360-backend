const User = require("../models/user");
const { StatusCodes } = require("http-status-codes");
const {
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
} = require("../errors");
const youverify = require("../utils/youverify");
const { sendEmail } = require("../utils/sendEmails");
const crypto = require("crypto");
const path = require("path");
const ejs = require("ejs");

/**
 * YouVerify Sandbox Test Data Configuration
 * Organized by KYC Tiers and User Roles
 *
 * Environment: Sandbox (https://api.sandbox.youverify.co)
 *
 * TIER REQUIREMENTS BY ROLE:
 * - USER: Tier 1 (Phone + NIN) - Basic verification for platform access
 * - OWNER: Tier 1 + Tier 2 (Phone + NIN + Utility Bill) - Property listing capability
 * - ADMIN: No KYC required
 *
 * For monthly rent payments, users may need Tier 3 (BVN + Bank + Business)
 */
const YOUVERIFY_SANDBOX_DATA = {
  // TIER 1: Phone Number + NIN Verification
  tier1: {
    // Valid test data (will return "found" status)
    valid: {
      phone_numbers: [
        "08000000000", // Primary sandbox phone
        "08111111111", // Alternative valid phone
        "08222222222", // Additional valid phone
        "07000000000", // MTN test number
        "09000000000", // 9mobile test number
      ],
      nins: [
        "11111111111", // Primary sandbox NIN
        "22222222222", // Alternative valid NIN
        "33333333333", // Additional valid NIN
      ],
      // Expected response data for valid NIN
      nin_response_sample: {
        firstName: "JOHN",
        middleName: "ADEBAYO",
        lastName: "DOE",
        dateOfBirth: "1990-01-01",
        gender: "Male",
        mobile: "08000000000",
        address: "123 Test Street, Lagos, Nigeria",
        birthState: "Lagos",
        birthLGA: "Lagos Island",
        birthCountry: "Nigeria",
        religion: "Christianity",
      },
    },
    // Invalid test data (will return "not_found" status)
    invalid: {
      phone_numbers: [
        "08000000001", // Invalid phone (not found)
        "00000000000", // Invalid format
      ],
      nins: [
        "00000000000", // Invalid NIN (not found)
        "99999999999", // Another invalid NIN
      ],
    },
  },

  // TIER 2: Utility Bill Verification (Manual Review)
  tier2: {
    // Document types accepted
    document_types: [
      "electricity", // NEPA/PHCN bill
      "water", // Water corporation bill
      "gas", // Gas company bill
      "internet", // Internet service provider bill
      "cable_tv", // Cable TV subscription
      "phone", // Phone/telecom bill
    ],
    // Note: Tier 2 requires manual document review by admin
    // No automated verification through YouVerify API
  },

  // TIER 3: BVN + Bank Account + Business Verification
  tier3: {
    // Valid test data
    valid: {
      bvns: [
        "11111111111", // Primary sandbox BVN
        "22222222222", // Alternative valid BVN
      ],
      bank_accounts: [
        {
          account_number: "1000000000",
          bank_code: "058", // GTBank code
          bank_name: "Guaranty Trust Bank",
          account_name: "JOHN ADEBAYO DOE",
        },
        {
          account_number: "2000000000",
          bank_code: "011", // First Bank code
          bank_name: "First Bank of Nigeria",
          account_name: "JANE ADEBAYO SMITH",
        },
        {
          account_number: "3000000000",
          bank_code: "033", // UBA code
          bank_name: "United Bank for Africa",
          account_name: "MICHAEL ADEBAYO JOHNSON",
        },
      ],
      businesses: [
        {
          rc_number: "RC0000000", // Valid RC number
          business_name: "Test Company Limited",
          business_type: "company",
          country_code: "NG",
        },
        {
          rc_number: "BN0000000", // Valid BN number
          business_name: "Test Business Enterprise",
          business_type: "business",
          country_code: "NG",
        },
      ],
      // Expected BVN response data
      bvn_response_sample: {
        firstName: "JOHN",
        middleName: "ADEBAYO",
        lastName: "DOE",
        dateOfBirth: "1990-01-01",
        phoneNumber: "08000000000",
        registrationDate: "2010-01-01",
        enrollmentBank: "058",
        enrollmentBranch: "Victoria Island",
      },
    },
    // Invalid test data
    invalid: {
      bvns: [
        "00000000000", // Invalid BVN (not found)
      ],
      bank_accounts: [
        {
          account_number: "1111111111",
          bank_code: "058",
          bank_name: "Guaranty Trust Bank",
        },
      ],
      businesses: [
        {
          rc_number: "RC11111111", // Invalid RC number
          business_name: "Invalid Company",
          business_type: "company",
        },
      ],
    },
  },

  // ADDITIONAL YOUVERIFY SERVICES (for future implementation)
  additional_services: {
    // Driver's License Verification
    drivers_license: {
      valid: ["AAA00000AA00"],
      invalid: ["AAA11111AA11"],
    },
    // International Passport Verification
    passport: {
      valid: ["A11111111"],
      invalid: ["A00000000"],
    },
    // Permanent Voter's Card (PVC)
    pvc: {
      valid: ["00A0A0A000000000000"],
      invalid: ["11A1A1A111111111111"],
    },
    // Virtual NIN (vNIN)
    vnin: {
      valid: ["YV111111111111FY"],
      invalid: ["YV000000000000FY"],
    },
    // Tax Identification Number (TIN)
    tin: {
      valid: ["00000000-0000"],
      invalid: ["11111111-1111"],
    },
  },

  // ROLE-BASED KYC REQUIREMENTS
  role_requirements: {
    user: {
      required_tiers: ["tier1"],
      description: "Basic verification for platform access",
      verification_flow: [
        "Email verification",
        "Phone number verification",
        "NIN verification",
      ],
    },
    owner: {
      required_tiers: ["tier1", "tier2"],
      description: "Enhanced verification for property listing",
      verification_flow: [
        "Email verification",
        "Phone number verification",
        "NIN verification",
        "Utility bill upload and review",
      ],
    },
    admin: {
      required_tiers: [],
      description: "No KYC verification required",
      verification_flow: [],
    },
  },

  // TESTING SCENARIOS
  test_scenarios: {
    successful_tier1: {
      phone_number: "08000000000",
      nin: "11111111111",
      expected_result: "verified",
    },
    failed_tier1_phone: {
      phone_number: "08000000001",
      nin: "11111111111",
      expected_result: "phone_verification_failed",
    },
    failed_tier1_nin: {
      phone_number: "08000000000",
      nin: "00000000000",
      expected_result: "nin_verification_failed",
    },
    successful_tier3: {
      bvn: "11111111111",
      account_number: "1000000000",
      bank_code: "058",
      business_name: "Test Company Limited",
      rc_number: "RC0000000",
      expected_result: "verified",
    },
    failed_tier3_bvn: {
      bvn: "00000000000",
      account_number: "1000000000",
      bank_code: "058",
      expected_result: "bvn_verification_failed",
    },
    failed_tier3_bank: {
      bvn: "11111111111",
      account_number: "1111111111",
      bank_code: "058",
      expected_result: "bank_verification_failed",
    },
  },
};

/**
 * Get sandbox test data for development and testing
 */
const getSandboxTestData = async (req, res) => {
  // Only allow in development/sandbox environment
  if (process.env.NODE_ENV === "production") {
    throw new BadRequestError("Sandbox data not available in production");
  }

  res.status(StatusCodes.OK).json({
    message: "YouVerify Sandbox Test Data",
    environment: "sandbox",
    base_url: "https://api.sandbox.youverify.co",
    data: YOUVERIFY_SANDBOX_DATA,
    usage_notes: [
      "Use valid test data for successful verification scenarios",
      "Use invalid test data for failure testing scenarios",
      "Tier 2 requires manual document review by admin",
      "All test data only works in sandbox environment",
      "Switch to production data when going live",
    ],
  });
};

/**
 * Get KYC status for the current user
 */
const getKycStatus = async (req, res) => {
  const user = await User.findById(req.user._id).select("kyc role");

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Admin users don't need KYC verification
  if (user.role === "admin") {
    return res.status(StatusCodes.OK).json({
      kyc: {},
      requiredTiers: [],
      overallStatus: "not_required",
      message: "KYC verification is not required for admin users",
    });
  }

  // Determine which tiers are required based on role
  // USER: Tier 1 (Phone + NIN), Tier 2 (Utility Bill), Tier 3 (Bank + BVN + Business) for monthly rent
  // OWNER: Tier 1 (Phone + NIN), Tier 2 (Utility Bill)
  const requiredTiers = user.role === "owner" ? ["tier1", "tier2"] : ["tier1"];

  // Calculate overall KYC status
  let overallStatus = "incomplete";

  if (
    requiredTiers.every(
      (tier) =>
        user.kyc && user.kyc[tier] && user.kyc[tier].status === "verified"
    )
  ) {
    overallStatus = "complete";
  } else if (
    requiredTiers.some(
      (tier) =>
        user.kyc && user.kyc[tier] && user.kyc[tier].status === "pending"
    )
  ) {
    overallStatus = "pending";
  }

  res.status(StatusCodes.OK).json({
    kyc: user.kyc || {},
    requiredTiers,
    overallStatus,
  });
};

/**
 * Initiate Tier 1 verification (email and phone)
 */
const initiateTier1Verification = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Initialize KYC object if it doesn't exist
  if (!user.kyc) {
    user.kyc = {
      tier1: {
        status: "pending",
        email_verified: false,
        phone_verified: false,
      },
    };
  } else if (!user.kyc.tier1) {
    user.kyc.tier1 = {
      status: "pending",
      email_verified: false,
      phone_verified: false,
    };
  }

  // Generate email verification token
  const emailVerificationToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(emailVerificationToken)
    .digest("hex");

  // Save token to user
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  await user.save();

  // Send verification email
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${emailVerificationToken}`;

  try {
    await ejs.renderFile(
      path.join(__dirname, "../views/emails/verifyEmail.ejs"),
      { verificationUrl, name: user.first_name },
      async (err, data) => {
        if (err) {
          console.log(err);
        } else {
          await sendEmail({
            to: user.email,
            subject: "Email Verification",
            html: data,
          });
        }
      }
    );

    res.status(StatusCodes.OK).json({
      message: "Verification email sent successfully",
      kyc: user.kyc,
    });
  } catch (error) {
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();
    throw new BadRequestError("Email could not be sent");
  }
};

/**
 * Initiate phone number verification for Tier 1
 */
const initiatePhoneVerification = async (req, res) => {
  const { phone_number } = req.body;

  if (!phone_number) {
    throw new BadRequestError("Phone number is required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  try {
    // Initialize KYC object if it doesn't exist
    if (!user.kyc) {
      user.kyc = {
        tier1: {
          status: "pending",
          phone_verified: false,
          nin_verified: false,
        },
      };
    } else if (!user.kyc.tier1) {
      user.kyc.tier1 = {
        status: "pending",
        phone_verified: false,
        nin_verified: false,
      };
    }

    // Update user's phone number
    user.phone_number = phone_number;

    // Verify phone number using YouVerify
    const verificationResponse = await youverify.verifyPhoneNumber(
      phone_number
    );

    // Check if verification was successful
    if (
      verificationResponse.success &&
      verificationResponse.data.status === "found"
    ) {
      // Phone number is verified directly
      user.kyc.tier1.phone_verified = true;

      // Check if Tier 1 is now complete
      if (user.kyc.tier1.email_verified) {
        user.kyc.tier1.status = "verified";
        user.kyc.tier1.completed_at = new Date();

        // Check if user was referred and verify the referral
        if (user.referral?.referred_by) {
          try {
            const Referral = require("../models/referral");
            const referral = await Referral.findOne({
              referred_user: user._id,
              status: "pending",
            });

            if (referral) {
              await referral.markAsVerified();
              console.log(
                `Referral verified for user ${user._id} via phone verification`
              );
            }
          } catch (error) {
            console.error("Error verifying referral:", error);
            // Don't fail the phone verification if referral verification fails
          }
        }
      }

      await user.save();

      res.status(StatusCodes.OK).json({
        message: "Phone number verified successfully",
        kyc: user.kyc,
      });
    } else {
      // If YouVerify verification fails, inform the user
      throw new BadRequestError(
        "Phone number verification failed. Please ensure you've entered a valid Nigerian phone number."
      );
    }
  } catch (error) {
    throw new BadRequestError(
      error.message || "Phone verification initiation failed"
    );
  }
};

/**
 * Verify phone number for Tier 1 (This method is kept for API compatibility)
 *
 * Note: This method is now deprecated as we use direct verification with YouVerify.
 * It's kept for backward compatibility with existing API clients.
 */
const verifyPhoneNumber = async (_req, res) => {
  res.status(StatusCodes.BAD_REQUEST).json({
    message:
      "This verification method is no longer supported. Please use initiatePhoneVerification instead.",
  });
};

/**
 * Verify email for Tier 1 (called from email verification endpoint)
 */
const verifyEmail = async (req, res) => {
  const { token } = req.params;

  const verificationToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: verificationToken,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new BadRequestError("Invalid or expired verification token");
  }

  // Initialize KYC object if it doesn't exist
  if (!user.kyc) {
    user.kyc = {
      tier1: {
        status: "pending",
        email_verified: false,
        phone_verified: false,
      },
    };
  } else if (!user.kyc.tier1) {
    user.kyc.tier1 = {
      status: "pending",
      email_verified: false,
      phone_verified: false,
    };
  }

  // Update verification status
  user.is_verified = true;
  user.kyc.tier1.email_verified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;

  // Check if Tier 1 is now complete
  if (user.kyc.tier1.phone_verified) {
    user.kyc.tier1.status = "verified";
    user.kyc.tier1.completed_at = new Date();

    // Check if user was referred and verify the referral
    if (user.referral?.referred_by) {
      try {
        const Referral = require("../models/referral");
        const referral = await Referral.findOne({
          referred_user: user._id,
          status: "pending",
        });

        if (referral) {
          await referral.markAsVerified();
          console.log(
            `Referral verified for user ${user._id} via email verification`
          );
        }
      } catch (error) {
        console.error("Error verifying referral:", error);
        // Don't fail the email verification if referral verification fails
      }
    }
  }

  await user.save();

  res.status(StatusCodes.OK).json({
    message: "Email verified successfully",
    kyc: user.kyc,
  });
};

/**
 * Submit Tier 1 verification (phone and NIN)
 */
const submitTier1Verification = async (req, res) => {
  console.log("Tier 1 verification request received:", {
    body: req.body,
    user_id: req.user._id,
  });

  const { phone_number, nin } = req.body;

  if (!phone_number) {
    throw new BadRequestError("Phone number is required");
  }

  if (!nin) {
    throw new BadRequestError("NIN is required");
  }

  // Ensure both values are strings
  const phoneString = String(phone_number).trim();
  const ninString = String(nin).trim();

  if (!phoneString) {
    throw new BadRequestError("Phone number cannot be empty");
  }

  if (!ninString) {
    throw new BadRequestError("NIN cannot be empty");
  }

  // Basic NIN format validation (11 digits)
  const ninRegex = /^\d{11}$/;
  if (!ninRegex.test(ninString)) {
    throw new BadRequestError("NIN must be exactly 11 digits");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Log the verification attempt for debugging
  console.log(`Tier 1 verification attempt for user ${user._id}:`, {
    submitted_phone: phoneString,
    current_phone: user.phone_number,
    submitted_nin: ninString,
    current_tier1_status: user.kyc?.tier1?.status,
  });

  // Check if Tier 1 is already verified and phone number is being changed
  const isAlreadyVerified = user.kyc?.tier1?.status === "verified";
  const phoneNumberChanged = user.phone_number !== phoneString;

  if (isAlreadyVerified && phoneNumberChanged) {
    throw new BadRequestError(
      "Cannot change phone number after Tier 1 verification is complete. Please contact support if you need to update your phone number."
    );
  }

  try {
    // Check if phone number has changed or needs verification
    const phoneAlreadyVerified = user.kyc?.tier1?.phone_verified === true;

    let phoneVerificationResponse;

    // Only verify phone number if it's new/changed or not previously verified
    if (phoneNumberChanged || !phoneAlreadyVerified) {
      console.log(
        `Phone verification needed. Changed: ${phoneNumberChanged}, Previously verified: ${phoneAlreadyVerified}`
      );

      // Verify phone number using YouVerify
      phoneVerificationResponse = await youverify.verifyPhoneNumber(
        phoneString
      );

      // Check phone verification result
      if (
        !phoneVerificationResponse.success ||
        phoneVerificationResponse.data.status !== "found"
      ) {
        throw new BadRequestError(
          "Phone number verification failed. Please ensure you've entered a valid Nigerian phone number."
        );
      }
    } else {
      console.log("Phone number already verified, skipping verification");
      phoneVerificationResponse = { success: true, data: { status: "found" } };
    }

    // Always verify NIN (as it's required for Tier 1)
    const ninVerificationResponse = await youverify.verifyNIN(
      ninString,
      user.first_name,
      user.last_name
    );

    // Check NIN verification result
    if (
      !ninVerificationResponse.success ||
      ninVerificationResponse.data.status !== "found"
    ) {
      throw new BadRequestError(
        "NIN verification failed. Please ensure you've entered a valid NIN."
      );
    }

    // Prepare the update object
    const updateData = {
      phone_number: phoneString, // Always update to ensure consistency
      "kyc.tier1.phone_verified": true,
      "kyc.tier1.nin_verified": true,
      "kyc.tier1.nin": ninString,
      // Store phone verification data from YouVerify
      "kyc.tier1.phone_verification_data": {
        verification_id: phoneVerificationResponse.data.id,
        status: phoneVerificationResponse.data.status,
        phone_details: phoneVerificationResponse.data.phoneDetails || [],
        verification_response: phoneVerificationResponse.data,
        verified_at: new Date(),
      },
      // Store NIN verification data from YouVerify
      "kyc.tier1.nin_verification_data": {
        verification_id: ninVerificationResponse.data.id,
        status: ninVerificationResponse.data.status,
        first_name: ninVerificationResponse.data.firstName,
        middle_name: ninVerificationResponse.data.middleName,
        last_name: ninVerificationResponse.data.lastName,
        date_of_birth: ninVerificationResponse.data.dateOfBirth,
        gender: ninVerificationResponse.data.gender,
        address: ninVerificationResponse.data.address,
        mobile: ninVerificationResponse.data.mobile,
        birth_state: ninVerificationResponse.data.birthState,
        birth_lga: ninVerificationResponse.data.birthLGA,
        birth_country: ninVerificationResponse.data.birthCountry,
        religion: ninVerificationResponse.data.religion,
        image: ninVerificationResponse.data.image,
        verification_response: ninVerificationResponse.data,
        verified_at: new Date(),
      },
    };

    // Mark tier1 as verified since both phone and NIN are now verified
    updateData["kyc.tier1.status"] = "verified";
    updateData["kyc.tier1.completed_at"] = new Date();

    // Update user using findByIdAndUpdate to avoid validation issues
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: false } // Disable validators to avoid short_id issue
    );

    // Handle referral verification if tier1 is now complete
    if (
      updateData["kyc.tier1.status"] === "verified" &&
      user.referral?.referred_by
    ) {
      try {
        const Referral = require("../models/referral");
        const referral = await Referral.findOne({
          referred_user: user._id,
          status: "pending",
        });

        if (referral) {
          await referral.markAsVerified();
          console.log(
            `Referral verified for user ${user._id} via Tier 1 verification`
          );
        }
      } catch (error) {
        console.error("Error verifying referral:", error);
        // Don't fail the verification if referral verification fails
      }
    }

    res.status(StatusCodes.OK).json({
      message: "Tier 1 verification submitted successfully",
      kyc: updatedUser.kyc,
      user: {
        _id: updatedUser._id,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        email: updatedUser.email,
        phone_number: updatedUser.phone_number,
        photo: updatedUser.photo,
        business_name: updatedUser.business_name,
        role: updatedUser.role,
        is_verified: updatedUser.is_verified,
        is_active: updatedUser.is_active,
        registration_payment_status: updatedUser.registration_payment_status,
        registration_payment: updatedUser.registration_payment,
        host_details: updatedUser.host_details,
        favorites: updatedUser.favorites,
        short_id: updatedUser.short_id,
        kyc: updatedUser.kyc,
        referral: updatedUser.referral,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
      verification_details: {
        phone_number_verified: true,
        nin_verified: true,
        phone_number_updated: phoneNumberChanged,
        tier1_status: updatedUser.kyc.tier1.status,
      },
    });
  } catch (error) {
    console.error("Tier 1 verification error:", error);

    // Provide more specific error messages
    if (error.message.includes("Channel's first argument")) {
      throw new BadRequestError(
        "Invalid phone number format. Please enter a valid Nigerian phone number."
      );
    }

    if (error.message.includes("NIN")) {
      throw new BadRequestError(
        "Invalid NIN format. Please enter a valid 11-digit NIN."
      );
    }

    throw new BadRequestError(error.message || "Tier 1 verification failed");
  }
};

/**
 * Submit Tier 2 verification (utility bill upload)
 */
const submitTier2Verification = async (req, res) => {
  const { document_type } = req.body;

  if (!document_type) {
    throw new BadRequestError("Document type is required");
  }

  if (!req.file) {
    throw new BadRequestError("Utility bill document is required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Check if Tier 1 is verified
  if (!user.kyc || !user.kyc.tier1 || user.kyc.tier1.status !== "verified") {
    throw new BadRequestError("You must complete Tier 1 verification first");
  }

  // Validate document type
  const validDocumentTypes = [
    "electricity",
    "water",
    "gas",
    "internet",
    "cable_tv",
    "phone",
  ];
  if (!validDocumentTypes.includes(document_type)) {
    throw new BadRequestError("Invalid document type");
  }

  try {
    // Initialize Tier 2 if it doesn't exist
    if (!user.kyc.tier2) {
      user.kyc.tier2 = {
        status: "not_started",
        utility_bill: {
          verification_status: "not_submitted",
        },
      };
    }

    // Update utility bill information
    user.kyc.tier2.utility_bill = {
      document: {
        url: req.file.path,
        public_id: req.file.filename,
        asset_id: req.file.asset_id,
        original_name: req.file.originalname,
        size: req.file.size,
        format: req.file.format,
      },
      document_type: document_type,
      uploaded_at: new Date(),
      verification_status: "pending",
    };

    // Update overall Tier 2 status
    user.kyc.tier2.status = "pending";

    await user.save();

    res.status(StatusCodes.OK).json({
      message:
        "Tier 2 verification submitted successfully. Your utility bill is under review.",
      kyc: user.kyc,
    });
  } catch (error) {
    throw new BadRequestError(error.message || "Tier 2 verification failed");
  }
};

/**
 * Submit Tier 3 verification (BVN, bank account, and business verification)
 */
const submitTier3Verification = async (req, res) => {
  const {
    bvn_number,
    account_number,
    bank_code,
    business_name,
    business_type,
    rc_number,
  } = req.body;

  if (!bvn_number) {
    throw new BadRequestError("BVN is required");
  }

  if (!account_number || !bank_code) {
    throw new BadRequestError("Bank account number and bank code are required");
  }

  if (!business_name || !business_type) {
    throw new BadRequestError("Business information is required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Check if Tier 2 is verified
  if (!user.kyc || !user.kyc.tier2 || user.kyc.tier2.status !== "verified") {
    throw new BadRequestError("You must complete Tier 2 verification first");
  }

  // Validate BVN format (11 digits)
  const bvnRegex = /^\d{11}$/;
  if (!bvnRegex.test(bvn_number)) {
    throw new BadRequestError("BVN must be exactly 11 digits");
  }

  // Validate account number format (10 digits)
  const accountRegex = /^\d{10}$/;
  if (!accountRegex.test(account_number)) {
    throw new BadRequestError("Account number must be exactly 10 digits");
  }

  // Validate business type
  const validBusinessTypes = ["company", "business", "workplace"];
  if (!validBusinessTypes.includes(business_type)) {
    throw new BadRequestError("Invalid business type");
  }

  try {
    // Initialize Tier 3 if it doesn't exist
    if (!user.kyc.tier3) {
      user.kyc.tier3 = {
        status: "not_started",
        bank_account: { verification_status: "not_submitted" },
        bvn: { verification_status: "not_submitted" },
        business: { verification_status: "not_submitted" },
      };
    }

    let allVerificationsSuccessful = true;
    const verificationResults = {};

    // 1. Verify BVN using YouVerify
    try {
      const bvnVerificationResponse = await youverify.verifyBVN(
        bvn_number,
        user.first_name,
        user.last_name
      );
      console.log("bvnVerificationResponse", bvnVerificationResponse);
      if (
        bvnVerificationResponse.success &&
        bvnVerificationResponse.data.status === "found"
      ) {
        user.kyc.tier3.bvn = {
          bvn_number: bvn_number,
          verification_status: "verified",
          verification_data: {
            verification_id: bvnVerificationResponse.data.id,
            status: bvnVerificationResponse.data.status,
            first_name: bvnVerificationResponse.data.firstName,
            middle_name: bvnVerificationResponse.data.middleName,
            last_name: bvnVerificationResponse.data.lastName,
            date_of_birth: bvnVerificationResponse.data.dateOfBirth,
            phone_number: bvnVerificationResponse.data.phoneNumber,
            registration_date: bvnVerificationResponse.data.registrationDate,
            enrollment_bank: bvnVerificationResponse.data.enrollmentBank,
            enrollment_branch: bvnVerificationResponse.data.enrollmentBranch,
            image: bvnVerificationResponse.data.image,
            verification_response: bvnVerificationResponse.data,
            verified_at: new Date(),
          },
        };
        verificationResults.bvn = "verified";
      } else {
        throw new Error("BVN verification failed");
      }
    } catch (error) {
      console.error("BVN verification error:", error);
      user.kyc.tier3.bvn = {
        bvn_number: bvn_number,
        verification_status: "rejected",
      };
      verificationResults.bvn = "failed";
      allVerificationsSuccessful = false;
    }

    // 2. Verify Bank Account using YouVerify
    try {
      const bankVerificationResponse = await youverify.verifyBankAccount(
        account_number,
        bank_code
      );

      if (
        bankVerificationResponse.success &&
        bankVerificationResponse.data.status === "found"
      ) {
        // Handle bank account verification response structure according to YouVerify documentation
        const bankDetails = bankVerificationResponse.data.bankDetails || {};
        user.kyc.tier3.bank_account = {
          account_number: account_number,
          bank_code: bank_code,
          bank_name:
            bankDetails.bankName || bankVerificationResponse.data.bankName,
          account_name:
            bankDetails.accountName ||
            bankVerificationResponse.data.accountName,
          verification_status: "verified",
          verification_data: {
            verification_id: bankVerificationResponse.data.id,
            parent_id: bankVerificationResponse.data.parentId,
            status: bankVerificationResponse.data.status,
            reason: bankVerificationResponse.data.reason,
            data_validation: bankVerificationResponse.data.dataValidation,
            selfie_validation: bankVerificationResponse.data.selfieValidation,
            is_consent: bankVerificationResponse.data.isConsent,
            id_number: bankVerificationResponse.data.idNumber,
            business_id: bankVerificationResponse.data.businessId,
            type: bankVerificationResponse.data.type,
            requested_at: bankVerificationResponse.data.requestedAt,
            requested_by_id: bankVerificationResponse.data.requestedById,
            country: bankVerificationResponse.data.country,
            created_at: bankVerificationResponse.data.createdAt,
            last_modified_at: bankVerificationResponse.data.lastModifiedAt,
            requested_by: bankVerificationResponse.data.requestedBy,
            bank_details: {
              account_name:
                bankDetails.accountName ||
                bankVerificationResponse.data.accountName,
              account_number:
                bankDetails.accountNumber ||
                bankVerificationResponse.data.accountNumber ||
                account_number,
              bank_name:
                bankDetails.bankName || bankVerificationResponse.data.bankName,
            },
            verification_response: bankVerificationResponse.data,
            verified_at: new Date(),
          },
        };
        verificationResults.bank_account = "verified";
      } else {
        throw new Error("Bank account verification failed");
      }
    } catch (error) {
      console.error("Bank account verification error:", error);
      user.kyc.tier3.bank_account = {
        account_number: account_number,
        bank_code: bank_code,
        verification_status: "rejected",
        verification_data: {
          error_message: error.message,
          failed_at: new Date(),
        },
      };
      verificationResults.bank_account = "failed";
      allVerificationsSuccessful = false;
    }

    // 3. Verify Business using YouVerify (if RC number is provided)
    if (rc_number && business_type === "company") {
      try {
        const businessVerificationResponse = await youverify.verifyBusiness(
          rc_number,
          business_name
        );
        console.log("businessVerification", businessVerificationResponse);
        if (
          businessVerificationResponse.success &&
          businessVerificationResponse.data.status === "found"
        ) {
          // Handle global business verification response structure
          const businessData = businessVerificationResponse.data;
          user.kyc.tier3.business = {
            business_name: business_name,
            business_type: business_type,
            rc_number: rc_number,
            verification_status: "verified",
            verification_data: {
              verification_id: businessData.id,
              status: businessData.status,
              company_name: businessData.name || businessData.companyName,
              registration_number: businessData.registrationNumber,
              company_type:
                businessData.typeOfEntity || businessData.companyType,
              registration_date: businessData.registrationDate,
              company_status: businessData.companyStatus,
              address: businessData.address,
              directors: businessData.keyPersonnel || businessData.directors,
              verification_response: businessData,
              verified_at: new Date(),
            },
          };
          verificationResults.business = "verified";
        } else {
          throw new Error("Business verification failed");
        }
      } catch (error) {
        console.error("Business verification error:", error);
        user.kyc.tier3.business = {
          business_name: business_name,
          business_type: business_type,
          rc_number: rc_number,
          verification_status: "rejected",
        };
        verificationResults.business = "failed";
        allVerificationsSuccessful = false;
      }
    } else {
      // For non-company business types, mark as verified without YouVerify check
      user.kyc.tier3.business = {
        business_name: business_name,
        business_type: business_type,
        rc_number: rc_number || null,
        verification_status: "verified",
        verification_data: {
          verified_at: new Date(),
        },
      };
      verificationResults.business = "verified";
    }

    // Update overall Tier 3 status
    if (allVerificationsSuccessful) {
      user.kyc.tier3.status = "verified";
      user.kyc.tier3.completed_at = new Date();
    } else {
      user.kyc.tier3.status = "rejected";
    }

    await user.save();

    res.status(StatusCodes.OK).json({
      message: allVerificationsSuccessful
        ? "Tier 3 verification completed successfully"
        : "Tier 3 verification completed with some failures",
      kyc: user.kyc,
      verification_results: verificationResults,
    });
  } catch (error) {
    throw new BadRequestError(error.message || "Tier 3 verification failed");
  }
};

module.exports = {
  getSandboxTestData,
  getKycStatus,
  initiateTier1Verification,
  initiatePhoneVerification,
  verifyPhoneNumber,
  verifyEmail,
  submitTier1Verification,
  submitTier2Verification,
  submitTier3Verification,
};
