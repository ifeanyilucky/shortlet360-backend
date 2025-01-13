const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const auth = require("../middlewares/authentication");

// Get property availability (public route)
router.get(
  "/availability/:property_id",
  bookingController.getPropertyAvailability
);

// Protected routes
router.use(auth);

// Create a new booking
router.post("/", bookingController.createBooking);

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
