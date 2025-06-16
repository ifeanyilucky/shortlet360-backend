const express = require("express");
const router = express.Router();
const authenticateUser = require("../middlewares/authentication");

const {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  verifyEmail,
  validateDiscountCode,
  completeRegistrationPayment,
} = require("../controllers/auth");

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.patch("/change-password", authenticateUser, changePassword);
router.get("/profile", authenticateUser, getProfile);
router.patch("/profile", authenticateUser, updateProfile);
router.get("/verify-email/:token", verifyEmail);
router.post("/validate-discount-code", authenticateUser, validateDiscountCode);
router.post("/complete-registration-payment", authenticateUser, completeRegistrationPayment);

module.exports = router;
