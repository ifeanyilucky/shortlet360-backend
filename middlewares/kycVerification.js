const { UnauthenticatedError, BadRequestError } = require("../errors");
const User = require("../models/user");

/**
 * Middleware to check if a user has completed the required KYC verification tiers
 * @param {Array} requiredTiers - Array of required KYC tiers (e.g., ['tier1', 'tier2'])
 * @returns {Function} - Express middleware function
 */
const verifyKyc = (requiredTiers = []) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);

      if (!user) {
        throw new UnauthenticatedError("User not found");
      }

      // Admin users bypass all KYC verification requirements
      if (user.role === "admin") {
        return next();
      }

      // If no KYC object exists, user hasn't started verification
      if (!user.kyc) {
        throw new BadRequestError(
          `KYC verification required: ${requiredTiers.join(", ")}`
        );
      }

      // Check if all required tiers are verified
      const missingTiers = [];

      for (const tier of requiredTiers) {
        if (!user.kyc[tier] || user.kyc[tier].status !== "verified") {
          missingTiers.push(tier);
        }
      }

      if (missingTiers.length > 0) {
        throw new BadRequestError(
          `KYC verification required: ${missingTiers.join(", ")}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if an owner has completed required KYC verification (Tier 1 and Tier 2)
 */
const verifyOwnerKyc = verifyKyc(["tier1", "tier2"]);

/**
 * Middleware to check if a user has completed required KYC verification (Tier 1)
 */
const verifyUserKyc = verifyKyc(["tier1"]);

/**
 * Middleware to check if a user has completed required KYC verification for monthly rent (Tier 1, Tier 2, and Tier 3)
 */
const verifyMonthlyRentKyc = verifyKyc(["tier1", "tier2", "tier3"]);

module.exports = {
  verifyKyc,
  verifyOwnerKyc,
  verifyUserKyc,
  verifyMonthlyRentKyc,
};
