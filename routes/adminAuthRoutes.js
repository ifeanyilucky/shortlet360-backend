const express = require("express");
const router = express.Router();
const { registerAdmin, loginAdmin } = require("../controllers/adminAuthController");

// Admin authentication routes
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

module.exports = router;
