const express = require("express");
const router = express.Router();
const authenticateUser = require("../middlewares/authentication");
const {
  getAllDiscountCodes,
  getDiscountCodeById,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  toggleDiscountCodeStatus,
  getDiscountCodeStats,
} = require("../controllers/discountCodeController");

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin privileges required.",
    });
  }
  next();
};

// All routes require authentication and admin privileges
router.use(authenticateUser);
router.use(requireAdmin);

// GET /discount-codes - Get all discount codes
router.get("/", getAllDiscountCodes);

// GET /discount-codes/stats - Get discount code statistics
router.get("/stats", getDiscountCodeStats);

// GET /discount-codes/:id - Get discount code by ID
router.get("/:id", getDiscountCodeById);

// POST /discount-codes - Create new discount code
router.post("/", createDiscountCode);

// PUT /discount-codes/:id - Update discount code
router.put("/:id", updateDiscountCode);

// PATCH /discount-codes/:id/toggle - Toggle discount code status
router.patch("/:id/toggle", toggleDiscountCodeStatus);

// DELETE /discount-codes/:id - Delete discount code
router.delete("/:id", deleteDiscountCode);

module.exports = router;
