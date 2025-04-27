const User = require("../models/user");
const { BadRequestError, UnauthenticatedError, NotFoundError } = require("../errors");
const { generateShortUserId } = require("../utils/utils");

// User Controller
const userController = {
  // Register a new user
  register: async (req, res) => {
    const { first_name, last_name, email, password, role } = req.body;

    // Check if email already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      throw new BadRequestError("Email already exists");
    }

    // Generate short ID based on role
    const short_id = await generateShortUserId(role || "user");

    // Create user
    const user = await User.create({
      first_name,
      last_name,
      email,
      password,
      role: role || "user",
      short_id
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
      is_verified: user.is_verified
    };

    res.status(201).json({
      success: true,
      user: userData,
      token
    });
  },

  // Login user
  login: async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequestError("Please provide email and password");
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      throw new UnauthenticatedError("Invalid credentials");
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
      is_verified: user.is_verified
    };

    res.status(200).json({
      success: true,
      user: userData,
      token
    });
  },

  // Get current user
  getCurrentUser: async (req, res) => {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      throw new NotFoundError("User not found");
    }

    res.status(200).json({
      success: true,
      user
    });
  },

  // Update user profile
  updateProfile: async (req, res) => {
    const { first_name, last_name, phone_number, business_name } = req.body;

    // Find user and update
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        first_name,
        last_name,
        phone_number,
        business_name
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      throw new NotFoundError("User not found");
    }

    res.status(200).json({
      success: true,
      user
    });
  },

  // Get user by ID
  getUserById: async (req, res) => {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      throw new NotFoundError("User not found");
    }

    res.status(200).json({
      success: true,
      user
    });
  },

  // Get user by short ID
  getUserByShortId: async (req, res) => {
    const user = await User.findOne({ short_id: req.params.shortId }).select("-password");
    if (!user) {
      throw new NotFoundError("User not found");
    }

    res.status(200).json({
      success: true,
      user
    });
  }
};

module.exports = userController;