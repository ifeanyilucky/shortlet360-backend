const express = require("express");
const router = express.Router();
const referralController = require("../controllers/referralController");
const auth = require("../middlewares/authentication");
const adminAuth = require("../middlewares/adminAuth");

// Test route to verify referral routes are working
router.get("/test", (req, res) => {
  res.json({ message: "Referral routes are working!", timestamp: new Date() });
});

// User referral routes - require authentication
router.post(
  "/send-invitation",
  auth,
  referralController.sendReferralInvitation
);
router.get("/stats", auth, referralController.getReferralStats);
router.get("/validate", auth, referralController.validateReferralCode);

// Test route for admin endpoints
router.get("/admin/test", (req, res) => {
  res.json({
    message: "Admin referral routes are working!",
    timestamp: new Date(),
  });
});

// Admin referral routes - require both auth and admin authentication
router.get("/admin/all", auth, adminAuth, referralController.getAllReferrals);
router.get("/admin/:id", auth, adminAuth, referralController.getReferralById);
router.get(
  "/admin/analytics",
  auth,
  adminAuth,
  referralController.getReferralAnalytics
);

module.exports = router;
