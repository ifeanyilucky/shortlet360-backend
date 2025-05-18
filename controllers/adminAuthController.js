const User = require("../models/user");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, UnauthenticatedError } = require("../errors");
const { generateShortUserId } = require("../utils/utils");

// Admin registration
const registerAdmin = async (req, res) => {
  const { first_name, last_name, email, password, adminCode } = req.body;

  // Check if admin code is valid
  if (adminCode !== process.env.ADMIN_SECRET_CODE) {
    throw new UnauthenticatedError("Invalid admin code");
  }

  // Check if email already exists
  const emailExists = await User.findOne({ email });
  if (emailExists) {
    throw new BadRequestError("Email already exists");
  }

  // Generate short ID for admin
  const short_id = await generateShortUserId("admin");

  // Create admin user with active status and no payment required
  const user = await User.create({
    first_name,
    last_name,
    email,
    password,
    role: "admin",
    short_id,
    is_active: true,
    is_verified: true,
    registration_payment_status: "paid",
  });

  // Generate token
  const token = user.createJWT();

  // Return user data without password
  const userData = {
    _id: user._id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    short_id: user.short_id,
    is_verified: user.is_verified,
    is_active: user.is_active,
  };

  res.status(StatusCodes.CREATED).json({
    success: true,
    user: userData,
    token,
  });
};

// Admin login
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError("Please provide email and password");
  }

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    throw new UnauthenticatedError("Invalid credentials");
  }

  // Check if user is an admin
  if (user.role !== "admin") {
    throw new UnauthenticatedError("Access denied. Admin privileges required.");
  }

  // Check password
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new UnauthenticatedError("Invalid credentials");
  }

  // Generate token
  const token = user.createJWT();

  // Return user data without password
  const userData = {
    _id: user._id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    short_id: user.short_id,
    is_verified: user.is_verified,
    is_active: user.is_active,
  };

  res.status(StatusCodes.OK).json({
    success: true,
    user: userData,
    token,
  });
};

module.exports = {
  registerAdmin,
  loginAdmin,
};
