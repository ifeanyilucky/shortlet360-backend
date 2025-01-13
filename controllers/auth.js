const User = require("../models/user");
const crypto = require("crypto");
const { StatusCodes } = require("http-status-codes");
const {
  BadRequestError,
  UnauthenticatedError,
  NotFoundError,
} = require("../errors");
const sendEmail = require("../utils/sendEmails");
const path = require("path");
const ejs = require("ejs");

const register = async (req, res) => {
  // Check if user already exists
  const { email, role } = req.body;
  const oldUser = await User.findOne({ email });
  if (oldUser) {
    throw new BadRequestError("Another user with this email already exists.");
  }

  const result = await User.create({ ...req.body });

  const token = result.createJWT();
  res.status(StatusCodes.CREATED).json({ user: result, token, role });
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

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();

  res.status(StatusCodes.OK).json({
    message: "Email verified successfully",
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
};
