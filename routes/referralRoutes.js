const express = require("express");
const router = express.Router();
const referralController = require("../controllers/referralController");
const auth = require("../middlewares/authentication");
const adminAuth = require("../middlewares/adminAuth");

// Protected routes - require authentication
router.use(auth);

// User referral routes
router.post("/send-invitation", referralController.sendReferralInvitation);
router.get("/stats", referralController.getReferralStats);
router.get("/validate", referralController.validateReferralCode);

// Admin referral routes - require admin authentication
router.get("/admin/all", adminAuth, referralController.getAllReferrals);
router.get(
  "/admin/analytics",
  adminAuth,
  referralController.getReferralAnalytics
);

module.exports = router;
