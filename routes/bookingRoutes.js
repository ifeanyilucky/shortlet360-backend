const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const auth = require("../middlewares/authentication");
const { verifyUserKyc, verifyMonthlyRentKyc } = require("../middlewares/kycVerification");

// Get property availability (public route)
router.get(
  "/availability/:property_id",
  bookingController.getPropertyAvailability
);

// Protected routes
router.use(auth);

// Create a new booking - requires Tier 1 KYC for regular bookings
router.post("/", verifyUserKyc, bookingController.createBooking);

// Create a monthly rent booking - requires Tier 1, 2, and 3 KYC
router.post("/monthly-rent", verifyMonthlyRentKyc, bookingController.createBooking);

// Get filtered bookings
router.get("/", bookingController.getFilteredBookings);

// Get user's bookings
router.get("/user", bookingController.getUserBookings);

// Get user's booking statistics
router.get("/user/statistics", bookingController.getUserBookingStatistics);

// Update booking status
router.patch("/:id/status", bookingController.updateBookingStatus);

// Get booking by id
router.get("/:id", bookingController.getBooking);

module.exports = router;
