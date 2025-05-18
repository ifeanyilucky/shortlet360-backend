const express = require("express");
const router = express.Router();
const authenticateUser = require("../middlewares/authentication");
const kycController = require("../controllers/kycController");

// Get KYC status
router.get("/status", authenticateUser, kycController.getKycStatus);

// Tier 1 verification (email and phone)
router.post(
  "/tier1/initiate",
  authenticateUser,
  kycController.initiateTier1Verification
);
router.post(
  "/tier1/initiate-phone",
  authenticateUser,
  kycController.initiatePhoneVerification
);
router.post(
  "/tier1/verify-phone",
  authenticateUser,
  kycController.verifyPhoneNumber
);
router.get("/verify-email/:token", kycController.verifyEmail);

// Tier 2 verification (address and identity)
router.post(
  "/tier2/submit",
  authenticateUser,
  kycController.submitTier2Verification
);

// Tier 3 verification (employment and bank statement)
router.post(
  "/tier3/submit",
  authenticateUser,
  kycController.submitTier3Verification
);

module.exports = router;
