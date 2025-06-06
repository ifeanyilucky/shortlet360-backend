const User = require("../models/user");
const crypto = require("crypto");
const { StatusCodes } = require("http-status-codes");
const {
  BadRequestError,
  UnauthenticatedError,
  NotFoundError,
} = require("../errors");
const { sendEmail, sendWelcomeEmail } = require("../utils/sendEmails");
const path = require("path");
const ejs = require("ejs");
const { generateShortUserId } = require("../utils/utils");

// Register a new user
const register = async (req, res) => {
  // Check if user already exists
  const { email, role, referral_code } = req.body;
  const oldUser = await User.findOne({ email });
  if (oldUser) {
    throw new BadRequestError("Another user with this email already exists.");
  }

  const short_id = await generateShortUserId(role || "user");
  const currentYear = new Date().getFullYear();
  // Handle referral code if provided
  let referrerUser = null;
  if (referral_code) {
    // More flexible referral code validation
    // Accept formats: APLET-{short_id}-{year} or just find by referral_code directly
    let referrerShortId = null;

    // Try to extract short_id from referral code format: APLET-{short_id}-{year}
    const referralCodeMatch = referral_code.match(/^APLET-(.+)-(\d{4})$/);
    if (referralCodeMatch) {
      referrerShortId = referralCodeMatch[1];
      // Find user by short_id first
      referrerUser = await User.findOne({ short_id: referrerShortId });
    }

    // If not found by short_id, try to find by exact referral code
    if (!referrerUser) {
      referrerUser = await User.findOne({
        "referral.referral_code": referral_code,
      });
    }

    // If still not found, try a more lenient search
    if (!referrerUser && referrerShortId) {
      referrerUser = await User.findOne({ short_id: referrerShortId });
    }

    // Try alternative format matching (in case of different formats)
    if (!referrerUser && referral_code.startsWith("APLET-")) {
      // Try to extract any alphanumeric part after APLET-
      const altMatch = referral_code.match(/^APLET-([A-Za-z0-9]+)/);
      if (altMatch) {
        const possibleShortId = altMatch[1];
        referrerUser = await User.findOne({ short_id: possibleShortId });
      }
    }

    if (!referrerUser) {
      // Instead of throwing an error, just log it and continue without referral
      console.log(`Referral code not found: ${referral_code}`);
      // Don't throw error - just proceed without referral
    }

    // Check if user is trying to refer themselves (only if referrer was found)
    if (
      referrerUser &&
      referrerUser.email.toLowerCase() === email.toLowerCase()
    ) {
      throw new BadRequestError("You cannot refer yourself");
    }
  }

  // Generate referral code for the new user
  const userReferralCode = `APLET-${short_id}-${currentYear}`;

  // Create user with inactive status and pending payment
  const userData = {
    ...req.body,
    short_id,
    is_active: false,
    registration_payment_status: "pending",
    referral: {
      referral_code: userReferralCode,
      referred_by: referrerUser ? referrerUser._id : null,
      referral_stats: {
        total_referrals: 0,
        verified_referrals: 0,
        pending_referrals: 0,
        earned_rewards: 0,
        available_rewards: 0,
      },
    },
  };

  const result = await User.create(userData);

  // Create referral record if user was referred
  if (referrerUser) {
    const Referral = require("../models/referral");
    await Referral.create({
      referrer: referrerUser._id,
      referred_user: result._id,
      referral_code: referral_code,
      referred_user_role: role || "user",
      status: "pending",
    });

    // Update referrer's stats
    await User.findByIdAndUpdate(referrerUser._id, {
      $inc: {
        "referral.referral_stats.total_referrals": 1,
        "referral.referral_stats.pending_referrals": 1,
      },
    });
  }

  // Send welcome email to the user
  try {
    await sendWelcomeEmail(result);
    console.log(`Welcome email sent to ${result.email}`);
  } catch (error) {
    console.error(`Failed to send welcome email to ${result.email}:`, error);
    // We don't want to fail the registration if email sending fails
    // Just log the error and continue
  }

  const token = result.createJWT();
  res.status(StatusCodes.CREATED).json({
    user: result,
    token,
    role,
    requiresPayment: true,
    referralInfo: referrerUser
      ? {
          referredBy: `${referrerUser.first_name} ${referrerUser.last_name}`,
          referralCode: referral_code,
        }
      : null,
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new BadRequestError("Please provide email and password");
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw new UnauthenticatedError(
      "Sorry, we couldn't find an account with that email."
    );
  }

  const isPasswordCorrect = await user.comparePassword(password);
  // compare password

  if (!isPasswordCorrect) {
    throw new UnauthenticatedError(`Sorry, that password isn't right`);
  }

  // Check if user has completed registration payment (only for owners)
  if (user.registration_payment_status === "pending" && user.role === "owner") {
    const token = user.createJWT();
    return res.status(StatusCodes.OK).json({
      user,
      token,
      requiresPayment: true,
      message:
        "Please complete your registration payment to activate your account",
    });
  }

  // // Check if user account is active
  // if (!user.is_active) {
  //   throw new UnauthenticatedError(
  //     "Your account is not active. Please contact support."
  //   );
  // }

  const token = user.createJWT();

  res.status(StatusCodes.OK).json({
    user,
    token,
  });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new BadRequestError("Please provide an email address");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new NotFoundError("No user found with this email address");
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save();

  // Send reset password email
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  try {
    await ejs.renderFile(
      path.join(__dirname, "../views/emails/resetPassword.ejs"),
      { resetUrl },
      async (err, data) => {
        if (err) {
          console.log(err);
        } else {
          await sendEmail({
            to: user.email,
            subject: "Password Reset Request",
            html: data,
          });
        }
      }
    );

    res.status(StatusCodes.OK).json({
      message: "Password reset link sent to email",
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    throw new BadRequestError("Email could not be sent");
  }
};

const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    throw new BadRequestError("Please provide a new password");
  }

  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new BadRequestError("Invalid or expired reset token");
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(StatusCodes.OK).json({
    message: "Password reset successful",
  });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new BadRequestError("Please provide both current and new password");
  }

  const user = await User.findById(req.user._id);
  const isPasswordCorrect = await user.comparePassword(currentPassword);

  if (!isPasswordCorrect) {
    throw new BadRequestError("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  res.status(StatusCodes.OK).json({
    message: "Password updated successfully",
  });
};

const getProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) {
    throw new NotFoundError("User not found");
  }

  res.status(StatusCodes.OK).json({ user });
};

const updateProfile = async (req, res) => {
  const { email, username, ...updateData } = req.body;

  // Prevent email and username updates through this endpoint
  if (email) {
    throw new BadRequestError("Email cannot be updated through this endpoint");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { ...updateData },
    { new: true, runValidators: true }
  ).select("-password");

  if (!user) {
    throw new NotFoundError("User not found");
  }

  res.status(StatusCodes.OK).json({ user });
};

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

  user.is_verified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();

  res.status(StatusCodes.OK).json({
    message: "Email verified successfully",
  });
};

const completeRegistrationPayment = async (req, res) => {
  const { payment } = req.body;

  if (!payment) {
    throw new BadRequestError("Payment information is required");
  }

  // Find and update the user with payment information and activate account
  // Using findByIdAndUpdate to avoid validation issues with required fields
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      registration_payment: payment,
      registration_payment_status: "paid",
      is_active: true,
    },
    { new: true, runValidators: false }
  );

  if (!updatedUser) {
    throw new NotFoundError("User not found");
  }

  // Generate new token with updated user info
  const token = updatedUser.createJWT();

  res.status(StatusCodes.OK).json({
    message: "Registration payment completed successfully",
    user: updatedUser,
    token,
  });
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  verifyEmail,
  completeRegistrationPayment,
};
