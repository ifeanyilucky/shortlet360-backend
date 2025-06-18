const express = require("express");
const router = express.Router();
const authenticateUser = require("../middlewares/authentication");
const kycController = require("../controllers/kycController");
const { single } = require("../middlewares/upload");

// Get sandbox test data (development/testing only)
router.get("/sandbox-data", kycController.getSandboxTestData);

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
router.post(
  "/tier1/submit",
  authenticateUser,
  kycController.submitTier1Verification
);
router.get("/verify-email/:token", kycController.verifyEmail);

// Tier 2 verification (utility bill upload)
router.post(
  "/tier2/submit",
  authenticateUser,
  ...single("utility_bill"),
  kycController.submitTier2Verification
);

// Tier 3 verification (BVN, bank account, and business verification)
router.post(
  "/tier3/submit",
  authenticateUser,
  kycController.submitTier3Verification
);

module.exports = router;
