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
 * Submit Tier 2 verification (address and identity)
 */
const submitTier2Verification = async (req, res) => {
  const { address, identity } = req.body;

  if (!address) {
    throw new BadRequestError("Address information is required");
  }

  if (!identity || !identity.nin) {
    throw new BadRequestError("NIN is required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Check if Tier 1 is verified
  if (!user.kyc || !user.kyc.tier1 || user.kyc.tier1.status !== "verified") {
    throw new BadRequestError("You must complete Tier 1 verification first");
  }

  try {
    // Verify NIN with YouVerify
    const ninVerificationResult = await youverify.verifyNIN(
      identity.nin,
      user.first_name,
      user.last_name
    );

    // Initialize Tier 2 if it doesn't exist
    if (!user.kyc.tier2) {
      user.kyc.tier2 = {
        status: "pending",
        address: {
          verification_status: "not_submitted",
        },
        identity: {
          verification_status: "not_submitted",
        },
      };
    }

    // Update address information
    user.kyc.tier2.address = {
      street: address.street,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country || "Nigeria",
      verification_status: "pending",
    };

    // Update identity information
    user.kyc.tier2.identity = {
      nin: identity.nin,
      verification_status:
        ninVerificationResult.success &&
        ninVerificationResult.data.status === "found"
          ? "verified"
          : "rejected",
      verification_data: ninVerificationResult,
      nin_verification_id: ninVerificationResult.data?.id || null,
    };

    // Update overall Tier 2 status
    user.kyc.tier2.status = "pending";

    // If both address and identity are verified, mark Tier 2 as verified
    if (
      user.kyc.tier2.address.verification_status === "verified" &&
      user.kyc.tier2.identity.verification_status === "verified"
    ) {
      user.kyc.tier2.status = "verified";
      user.kyc.tier2.completed_at = new Date();
    }

    await user.save();

    res.status(StatusCodes.OK).json({
      message: "Tier 2 verification submitted successfully",
      kyc: user.kyc,
    });
  } catch (error) {
    throw new BadRequestError(error.message || "Tier 2 verification failed");
  }
};

/**
 * Submit Tier 3 verification (employment and bank statement)
 */
const submitTier3Verification = async (req, res) => {
  const { employment, bank_statement } = req.body;

  if (!employment) {
    throw new BadRequestError("Employment information is required");
  }

  if (!bank_statement) {
    throw new BadRequestError("Bank statement information is required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Check if Tier 2 is verified
  if (!user.kyc || !user.kyc.tier2 || user.kyc.tier2.status !== "verified") {
    throw new BadRequestError("You must complete Tier 2 verification first");
  }

  try {
    // Initialize Tier 3 if it doesn't exist
    if (!user.kyc.tier3) {
      user.kyc.tier3 = {
        status: "pending",
        employment: {
          verification_status: "not_submitted",
        },
        bank_statement: {
          verification_status: "not_submitted",
        },
      };
    }

    // Update employment information
    user.kyc.tier3.employment = {
      employer_name: employment.employer_name,
      position: employment.position,
      employment_status: employment.employment_status,
      work_address: employment.work_address,
      work_phone: employment.work_phone,
      verification_status: "pending",
    };

    // Update bank statement information
    user.kyc.tier3.bank_statement = {
      bank_name: bank_statement.bank_name,
      account_number: bank_statement.account_number.slice(-4), // Store only last 4 digits
      statement_document: bank_statement.document,
      verification_status: "pending",
    };

    // Update overall Tier 3 status
    user.kyc.tier3.status = "pending";

    await user.save();

    res.status(StatusCodes.OK).json({
      message: "Tier 3 verification submitted successfully",
      kyc: user.kyc,
    });
  } catch (error) {
    throw new BadRequestError(error.message || "Tier 3 verification failed");
  }
};

module.exports = {
  getKycStatus,
  initiateTier1Verification,
  initiatePhoneVerification,
  verifyPhoneNumber,
  verifyEmail,
  submitTier2Verification,
  submitTier3Verification,
};
