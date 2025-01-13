const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    property_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    check_in_date: { type: Date, required: true },
    check_out_date: { type: Date, required: true },
    total_price: { type: Number, required: true },
    guest_count: { type: Number, required: true },
    booking_status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    payment_status: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
    },
    payment: Object,
    estimated_arrival: { type: String, required: true }, // Store time in 24-hour format (HH:mm)
    special_requests: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
