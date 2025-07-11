const Booking = require("../models/booking");
const Property = require("../models/property");
const User = require("../models/user");
const { BadRequestError, NotFoundError } = require("../errors");
const { sendEmail } = require("../utils/sendEmails");
const generatePDF = require("../utils/pdfGenerator");

const bookingController = {
  // Get booking by id
  getBooking: async (req, res) => {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate("property_id")
      .populate("guest", "name email phone");
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }
    res.status(200).json({ success: true, data: booking });
  },
  // Get property availability
  getPropertyAvailability: async (req, res) => {
    const { property_id } = req.params;

    // Check if property exists
    const property = await Property.findById(property_id);
    if (!property) {
      throw new NotFoundError("Property not found");
    }

    // Get all confirmed and pending bookings for the property
    const bookings = await Booking.find({
      property_id,
      booking_status: { $in: ["confirmed", "pending"] },
      check_out_date: { $gte: new Date() }, // Only get current and future bookings
    }).select("check_in_date check_out_date");

    // Combine property's unavailable dates with booked dates
    const unavailableDates = [
      // Include property's manually set unavailable dates
      ...property.unavailable_dates.map((date) => ({
        start_date: date.start_date,
        end_date: date.end_date,
        reason: date.reason || "External booking",
      })),
      // Include dates from confirmed/pending bookings
      ...bookings.map((booking) => ({
        start_date: booking.check_in_date,
        end_date: booking.check_out_date,
        reason: "Booked",
      })),
    ];

    // Format the response
    const response = {
      property_id,
      unavailable_dates: unavailableDates,
    };

    res.status(200).json({ success: true, data: response });
  },

  // Create a new booking
  createBooking: async (req, res) => {
    try {
      const {
        property_id,
        check_in_date,
        check_out_date,
        guest_count,
        payment,
        estimated_arrival,
        is_monthly_rent,
        monthly_rent_option,
      } = req.body;

      if (
        !property_id ||
        !check_in_date ||
        !check_out_date ||
        !guest_count ||
        !estimated_arrival
      ) {
        throw new BadRequestError(
          "Please provide all required booking details"
        );
      }

      if (!payment) {
        throw new BadRequestError("Payment information is required");
      }

      // Check if this is a monthly rent booking
      if (is_monthly_rent) {
        // Verify user has completed Tier 3 KYC for monthly rent (admin users bypass this check)
        const user = await User.findById(req.user._id);
        if (
          user.role !== "admin" &&
          (!user.kyc || !user.kyc.tier3 || user.kyc.tier3.status !== "verified")
        ) {
          throw new BadRequestError(
            "You must complete Tier 3 KYC verification to book monthly rentals"
          );
        }

        // Validate monthly rent option
        if (
          !monthly_rent_option ||
          !["option1", "option2"].includes(monthly_rent_option)
        ) {
          throw new BadRequestError(
            "Please select a valid monthly rent payment option"
          );
        }
      }

      const checkInDate = new Date(check_in_date);
      const checkOutDate = new Date(check_out_date);

      // Check against property's unavailable dates
      const property = await Property.findById(property_id);
      if (!property) {
        throw new NotFoundError("Property not found");
      }

      // Check if the dates overlap with any unavailable dates
      const isUnavailable = property.unavailable_dates.some((date) => {
        return (
          checkInDate <= new Date(date.end_date) &&
          checkOutDate >= new Date(date.start_date)
        );
      });

      if (isUnavailable) {
        throw new BadRequestError(
          "Property is not available for the selected dates"
        );
      }

      // Check for conflicting bookings
      const conflictingBookings = await Booking.find({
        property_id,
        booking_status: { $in: ["confirmed", "pending"] },
        $or: [
          {
            check_in_date: { $lte: checkOutDate },
            check_out_date: { $gte: checkInDate },
          },
        ],
      });

      if (conflictingBookings.length > 0) {
        throw new BadRequestError(
          "Property is not available for the selected dates"
        );
      }

      // Validate guest count
      if (guest_count > property.max_guests) {
        throw new BadRequestError(
          `Maximum ${property.max_guests} guests allowed for this property`
        );
      }

      // Calculate total price
      let total_price;

      if (is_monthly_rent) {
        // For monthly rent, use the yearly rent with interest
        const annual_rent = property.pricing.rent_per_year.annual_rent;
        const monthly_base = annual_rent / 12;

        // Calculate based on selected option
        if (monthly_rent_option === "option1") {
          // Option 1: 1.5% monthly interest (18% annually)
          const monthly_interest = annual_rent * 0.015;
          total_price = monthly_base + monthly_interest;
        } else {
          // Option 2: 2% monthly interest (24% annually)
          const monthly_interest = annual_rent * 0.02;
          total_price = monthly_base + monthly_interest;
        }
      } else {
        // For regular bookings, calculate based on nights
        const nights = Math.ceil(
          (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)
        );
        total_price = property.pricing.per_day.base_price * nights;
      }

      // Create booking with payment information
      const bookingData = {
        property_id,
        guest: req.user._id,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        guest_count,
        total_price,
        estimated_arrival,
        payment: payment,
        payment_status: "paid",
        booking_status: "confirmed",
      };

      // Add monthly rent details if applicable
      if (is_monthly_rent) {
        const annual_rent = property.pricing.rent_per_year.annual_rent;
        const monthly_base = annual_rent / 12;
        const interest_rate = monthly_rent_option === "option1" ? 0.015 : 0.02;
        const interest_amount = annual_rent * interest_rate;

        bookingData.is_monthly_rent = true;
        bookingData.monthly_rent_option = monthly_rent_option;
        bookingData.monthly_rent_details = {
          annual_rent,
          monthly_base,
          interest_rate,
          interest_amount,
        };
      }

      const booking = new Booking(bookingData);

      await booking.save();

      // Generate PDF receipt and send email to guest
      try {
        const populatedBooking = await Booking.findById(booking._id)
          .populate("property_id")
          .populate("guest");

        const pdfBuffer = await generatePDF("receipt", {
          booking: populatedBooking,
        });

        // Get guest email from the populated booking
        const guestEmail = populatedBooking.guest.email;
        const guestName = `${populatedBooking.guest.first_name} ${populatedBooking.guest.last_name}`;

        // Send email with PDF receipt to the guest/renter
        await sendEmail({
          to: guestEmail,
          subject: "Booking Confirmation - Aplet360",
          text: `Dear ${guestName},\n\nThank you for your booking. Your booking has been confirmed. Please find the attached receipt for your records.\n\nBest regards,\nAplet360 Team`,
          attachments: [
            {
              filename: `booking_receipt_${booking._id}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        });

        console.log(`Receipt email sent successfully to ${guestEmail}`);
      } catch (emailError) {
        console.error("Error sending receipt email:", emailError);
        // Don't throw error here as booking was successful, just log the email failure
      }

      res.status(201).json({ success: true, data: booking });
    } catch (error) {
      console.error("Error in createBooking:", error);
      throw error;
    }
  },

  // Get filtered bookings
  getFilteredBookings: async (req, res) => {
    const {
      property_id,
      guest,
      check_in_date,
      check_out_date,
      guest_count,
      booking_status,
      payment_status,
      min_price,
      max_price,
      sort_by,
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter object
    const filter = {};

    if (property_id) filter.property_id = property_id;
    if (guest) filter.guest = guest;
    if (booking_status) filter.booking_status = booking_status;
    if (payment_status) filter.payment_status = payment_status;
    if (guest_count) filter.guest_count = guest_count;

    // Handle date range filter
    if (check_in_date || check_out_date) {
      filter.check_in_date = {};
      if (check_in_date) filter.check_in_date.$gte = new Date(check_in_date);
      if (check_out_date)
        filter.check_out_date = { $lte: new Date(check_out_date) };
    }

    // Handle price range filter
    if (min_price || max_price) {
      filter.total_price = {};
      if (min_price) filter.total_price.$gte = Number(min_price);
      if (max_price) filter.total_price.$lte = Number(max_price);
    }

    // Build sort object
    let sortOptions = { createdAt: -1 }; // default sort
    if (sort_by) {
      switch (sort_by) {
        case "price_asc":
          sortOptions = { total_price: 1 };
          break;
        case "price_desc":
          sortOptions = { total_price: -1 };
          break;
        case "date_asc":
          sortOptions = { check_in_date: 1 };
          break;
        case "date_desc":
          sortOptions = { check_in_date: -1 };
          break;
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const bookings = await Booking.find(filter)
      .populate("property_id")
      .populate("guest", "name email phone")
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        current_page: Number(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: Number(limit),
      },
    });
  },

  // Get user's bookings
  getUserBookings: async (req, res) => {
    const bookings = await Booking.find({ guest: req.user._id })
      .populate("property_id")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: bookings });
  },

  // Update booking status
  updateBookingStatus: async (req, res) => {
    const { booking_status } = req.body;

    if (!booking_status) {
      throw new BadRequestError("Please provide booking status");
    }

    if (
      !["pending", "confirmed", "cancelled", "completed"].includes(
        booking_status
      )
    ) {
      throw new BadRequestError("Invalid booking status");
    }

    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, guest: req.user._id },
      { booking_status },
      { new: true }
    );

    if (!booking) {
      throw new NotFoundError(
        "Booking not found or you are not authorized to update it"
      );
    }

    res.status(200).json({ success: true, data: booking });
  },

  // Get user booking statistics
  getUserBookingStatistics: async (req, res) => {
    try {
      const userId = req.user._id;
      const timeframe = req.query.timeframe || "30"; // Default to last 30 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeframe));

      // Get all bookings for the user within timeframe
      const bookings = await Booking.find({
        guest: userId,
        createdAt: { $gte: startDate },
      }).populate("property_id");

      // Calculate statistics
      const stats = {
        total_bookings: bookings.length,
        booking_status_breakdown: {
          pending: bookings.filter((b) => b.booking_status === "pending")
            .length,
          confirmed: bookings.filter((b) => b.booking_status === "confirmed")
            .length,
          cancelled: bookings.filter((b) => b.booking_status === "cancelled")
            .length,
          completed: bookings.filter((b) => b.booking_status === "completed")
            .length,
        },
        total_spent: bookings.reduce(
          (sum, booking) => sum + booking.total_price,
          0
        ),
        average_booking_value:
          bookings.length > 0
            ? bookings.reduce((sum, booking) => sum + booking.total_price, 0) /
              bookings.length
            : 0,
        recent_bookings: await getRecentUserBookings(userId, startDate),
        upcoming_bookings: await getUpcomingBookings(userId),
        favorite_cities: await getFavoriteCities(userId),
      };

      res.status(200).json({
        success: true,
        timeframe: `Last ${timeframe} days`,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching statistics",
        error: error.message,
      });
    }
  },
};

// Helper function to get recent user bookings
async function getRecentUserBookings(userId, startDate) {
  return await Booking.find({
    guest: userId,
    createdAt: { $gte: startDate },
  })
    .populate("property_id", "property_name property_images location pricing")
    .select("booking_status check_in_date check_out_date total_price createdAt")
    .sort({ createdAt: -1 })
    .limit(5);
}

// Helper function to get upcoming bookings
async function getUpcomingBookings(userId) {
  const today = new Date();
  return await Booking.find({
    guest: userId,
    check_in_date: { $gte: today },
    booking_status: { $in: ["confirmed", "pending"] },
  })
    .populate("property_id", "property_name property_images location pricing")
    .select("booking_status check_in_date check_out_date total_price")
    .sort({ check_in_date: 1 })
    .limit(5);
}

// Helper function to get favorite cities
async function getFavoriteCities(userId) {
  const bookings = await Booking.find({ guest: userId }).populate(
    "property_id",
    "location"
  );

  const cityCounts = bookings.reduce((acc, booking) => {
    const city = booking.property_id.location.city;
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(cityCounts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

module.exports = bookingController;
