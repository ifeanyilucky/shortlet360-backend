const { UnauthenticatedError, ForbiddenError } = require("../errors");
const User = require("../models/user");

/**
 * Middleware to check if a user has admin role
 */
const adminAuth = async (req, res, next) => {
  try {
    // Check if user exists in request (should be set by authentication middleware)
    if (!req.user) {
      throw new UnauthenticatedError("Authentication invalid");
    }

    // Check if user has admin role
    if (req.user.role !== "admin") {
      throw new ForbiddenError("Access denied. Admin privileges required.");
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = adminAuth;
