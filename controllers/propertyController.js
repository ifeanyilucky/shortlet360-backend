const Property = require("../models/property");
const Booking = require("../models/booking");
const { BadRequestError, NotFoundError } = require("../errors");
const { generateShortPropertyId } = require("../utils/utils");

const propertyController = {
  // Create a new property
  createProperty: async (req, res) => {
    const propertyData = req.body;

    // Additional validation for rent properties
    if (propertyData.property_category === "rent") {
      if (!propertyData.pricing.rent_per_year.is_active) {
        throw new BadRequestError(
          "Yearly pricing must be active for rental properties"
        );
      }

      // Validate annual rent
      if (!propertyData.pricing.rent_per_year.annual_rent) {
        throw new BadRequestError(
          "Annual rent is required for rental properties"
        );
      }

      // Validate active fees
      const fees = [
        {
          name: "agency fee",
          value: propertyData.pricing.rent_per_year.agency_fee,
          isActive: propertyData.pricing.rent_per_year.is_agency_fee_active,
        },
        {
          name: "commission fee",
          value: propertyData.pricing.rent_per_year.commission_fee,
          isActive: propertyData.pricing.rent_per_year.is_commission_fee_active,
        },
        {
          name: "caution fee",
          value: propertyData.pricing.rent_per_year.caution_fee,
          isActive: propertyData.pricing.rent_per_year.is_caution_fee_active,
        },
        {
          name: "legal fee",
          value: propertyData.pricing.rent_per_year.legal_fee,
          isActive: propertyData.pricing.rent_per_year.is_legal_fee_active,
        },
      ];

      fees.forEach(({ name, value, isActive }) => {
        if (isActive && !value) {
          throw new BadRequestError(
            `${
              name.charAt(0).toUpperCase() + name.slice(1)
            } is required when active`
          );
        }
      });
    } else {
      // Validation for shortlet properties
      const { per_day, per_week, per_month } = propertyData.pricing;
      if (!per_day.is_active && !per_week.is_active && !per_month.is_active) {
        throw new BadRequestError(
          "Shortlet properties must have either daily, weekly or monthly pricing active"
        );
      }

      // Validate active pricing has values
      if (per_day.is_active && !per_day.base_price) {
        throw new BadRequestError("Daily base price is required when active");
      }
      if (per_week.is_active && !per_week.base_price) {
        throw new BadRequestError("Weekly base price is required when active");
      }
      if (per_month.is_active && !per_month.base_price) {
        throw new BadRequestError("Monthly base price is required when active");
      }
    }

    // Generate short ID and create property
    const short_id = await generateShortPropertyId();
    const property = new Property({
      ...propertyData,
      owner: req.user._id,
      short_id,
    });

    await property.save();
    res.status(201).json({ success: true, data: property });
  },

  // Get all properties with filtering, searching and pagination
  getAllProperties: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      console.log("req.query", req.query);

      // Build filter object
      let filter = {};

      // Owner filter
      if (req.query.owner) {
        filter.owner = req.query.owner;
      }

      // Text search on property name, description, and location (city and state)
      if (req.query.search) {
        filter.$or = [
          { property_name: { $regex: req.query.search, $options: "i" } },
          { property_description: { $regex: req.query.search, $options: "i" } },
          { "location.city": { $regex: req.query.search, $options: "i" } },
          { "location.state": { $regex: req.query.search, $options: "i" } },
          { "location.street_address": { $regex: req.query.search, $options: "i" } },
        ];
      }

      // Price range filter
      if (req.query.minPrice || req.query.maxPrice) {
        filter["pricing.per_day.base_price"] = {};
        if (req.query.minPrice)
          filter["pricing.per_day.base_price"].$gte = parseInt(
            req.query.minPrice
          );
        if (req.query.maxPrice)
          filter["pricing.per_day.base_price"].$lte = parseInt(
            req.query.maxPrice
          );
      }

      // Property category filter
      if (req.query.category) {
        filter.property_category = req.query.category.toLowerCase();
      }

      // Property type filter
      if (req.query.propertyType && req.query.propertyType !== "All Types") {
        filter.property_type = req.query.propertyType.toLowerCase();
      }

      // Location filters
      if (req.query.city) {
        filter["location.city"] = { $regex: req.query.city, $options: "i" };
      }
      if (req.query.state) {
        filter["location.state"] = { $regex: req.query.state, $options: "i" };
      }

      // Amenities filter (multiple amenities can be passed as comma-separated string)
      if (req.query.amenities) {
        const amenitiesList = req.query.amenities
          .split(",")
          .map((item) => item.trim());
        filter.amenities = { $all: amenitiesList };
      }

      // Room filters
      if (req.query.bedrooms) {
        filter.bedroom_count = parseInt(req.query.bedrooms);
      }
      if (req.query.bathrooms) {
        filter.bathroom_count = parseInt(req.query.bathrooms);
      }
      if (req.query.maxGuests) {
        filter.max_guests = { $gte: parseInt(req.query.maxGuests) };
      }

      // Active status filter
      if (req.query.isActive !== undefined) {
        filter.is_active = req.query.isActive === "true";
      }

      // Short ID (Property ID) filter
      if (req.query.short_id) {
        filter.short_id = req.query.short_id;
      }

      console.log("filter", filter);
      // Get total count for pagination
      const total = await Property.countDocuments(filter);

      // Get filtered and paginated properties
      const properties = await Property.find(filter)
        .populate("owner", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      console.log("properties", properties);

      res.status(200).json({
        success: true,
        data: properties,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          pages: Math.ceil(total / limit),
          perPage: limit,
          totalDocs: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching properties",
        error: error.message,
      });
    }
  },

  // Get single property
  getProperty: async (req, res) => {
    const property = await Property.findById(req.params.id).populate(
      "owner",
      "name email"
    );

    if (!property) {
      throw new NotFoundError("Property not found");
    }

    res.status(200).json({ success: true, data: property });
  },

  // Update property
  updateProperty: async (req, res) => {
    try {
      // First find the property to check ownership
      const existingProperty = await Property.findById(req.params.id);

      if (!existingProperty) {
        throw new NotFoundError("Property not found");
      }

      // Check if the user is the owner of the property
      if (existingProperty.owner.toString() !== req.user._id.toString()) {
        throw new NotFoundError("You are not authorized to update this property");
      }

      // Fix property_images structure if needed
      if (req.body.property_images && Array.isArray(req.body.property_images)) {
        req.body.property_images = req.body.property_images.map(img => {
          // Check if url is an object instead of a string
          if (img.url && typeof img.url === 'object' && img.url.url) {
            return {
              url: img.url.url,
              public_id: img.url.public_id || img.public_id || '',
              asset_id: img.url.asset_id || img.asset_id || '',
              _id: img._id // Keep the _id if it exists
            };
          }
          return img;
        });
      }

      // Update the property with the new data
      Object.assign(existingProperty, req.body);

      // Save the property to trigger the validation hooks
      await existingProperty.save();

      res.status(200).json({ success: true, data: existingProperty });
    } catch (error) {
      // If it's a validation error from Mongoose, convert it to a BadRequestError
      if (error.name === 'ValidationError') {
        const message = Object.values(error.errors).map(val => val.message).join(', ');
        throw new BadRequestError(message);
      } else if (error.name === 'CastError') {
        throw new BadRequestError(`Invalid data format: ${error.message}`);
      }

      // Re-throw other errors
      throw error;
    }
  },

  // Delete property
  deleteProperty: async (req, res) => {
    const property = await Property.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!property) {
      throw new NotFoundError(
        "Property not found or you are not authorized to delete it"
      );
    }

    res.status(200).json({ success: true, data: {} });
  },

  // Check property availability
  checkAvailability: async (req, res) => {
    const { check_in_date, check_out_date } = req.body;
    const propertyId = req.params.id;

    if (!check_in_date || !check_out_date) {
      throw new BadRequestError("Please provide check-in and check-out dates");
    }

    const checkInDate = new Date(check_in_date);
    const checkOutDate = new Date(check_out_date);

    if (checkInDate >= checkOutDate) {
      throw new BadRequestError("Check-in date must be before check-out date");
    }

    if (checkInDate < new Date()) {
      throw new BadRequestError("Check-in date cannot be in the past");
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      throw new NotFoundError("Property not found");
    }

    // Check if dates overlap with property's unavailable dates
    const isUnavailable = property.unavailable_dates.some((date) => {
      return (
        checkInDate <= new Date(date.end_date) &&
        checkOutDate >= new Date(date.start_date)
      );
    });

    // Check for conflicting bookings
    const conflictingBookings = await Booking.find({
      property_id: propertyId,
      booking_status: { $in: ["confirmed", "pending"] },
      $or: [
        {
          check_in_date: { $lte: checkOutDate },
          check_out_date: { $gte: checkInDate },
        },
      ],
    });

    const isAvailable = !isUnavailable && conflictingBookings.length === 0;

    res.status(200).json({
      success: true,
      available: isAvailable,
      unavailable_reason: isUnavailable
        ? "Blocked by owner"
        : conflictingBookings.length > 0
        ? "Already booked"
        : null,
    });
  },

  // Get owner statistics
  getOwnerStatistics: async (req, res) => {
    try {
      const ownerId = req.user._id;
      const timeframe = req.query.timeframe || "30"; // Default to last 30 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeframe));

      // Get all properties owned by the user
      const properties = await Property.find({ owner: ownerId });
      const propertyIds = properties.map((property) => property._id);

      // Get all bookings for these properties within timeframe
      const bookings = await Booking.find({
        property_id: { $in: propertyIds },
        createdAt: { $gte: startDate },
      }).populate("property_id");

      // Calculate statistics
      const stats = {
        total_properties: properties.length,
        active_properties: properties.filter((p) => p.is_active).length,
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
        total_revenue: bookings
          .filter((b) => b.booking_status === "completed")
          .reduce((sum, booking) => sum + booking.total_price, 0),
        average_booking_value:
          bookings.length > 0
            ? bookings.reduce((sum, booking) => sum + booking.total_price, 0) /
              bookings.length
            : 0,
        occupancy_rate: await calculateOccupancyRate(propertyIds, startDate),
        property_performance: await calculatePropertyPerformance(
          propertyIds,
          startDate
        ),
        recent_activity: await getRecentActivity(propertyIds, startDate),
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

  // Update property unavailable dates
  updateUnavailableDates: async (req, res) => {
    const { unavailable_dates } = req.body;
    const propertyId = req.params.id;

    // Validate dates
    if (!Array.isArray(unavailable_dates)) {
      throw new BadRequestError("Unavailable dates must be an array");
    }

    // Validate each date range
    unavailable_dates.forEach(({ start_date, end_date, reason }) => {
      if (!start_date || !end_date) {
        throw new BadRequestError(
          "Each date range must have start and end dates"
        );
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (startDate >= endDate) {
        throw new BadRequestError("Start date must be before end date");
      }
    });

    // Find property and verify ownership
    const property = await Property.findOne({
      _id: propertyId,
      owner: req.user._id,
    });

    if (!property) {
      throw new NotFoundError(
        "Property not found or you are not authorized to update it"
      );
    }

    // Update unavailable dates
    property.unavailable_dates = unavailable_dates;
    await property.save();

    res.status(200).json({
      success: true,
      message: "Unavailable dates updated successfully",
      data: property,
    });
  },

  // Get property availability
  getPropertyAvailability: async (req, res) => {
    const propertyId = req.params.id;

    const property = await Property.findById(propertyId);
    if (!property) {
      throw new NotFoundError("Property not found");
    }

    // Get all confirmed or pending bookings
    const bookings = await Booking.find({
      property_id: propertyId,
      booking_status: { $in: ["confirmed", "pending"] },
    }).select("check_in_date check_out_date");

    // Combine property's unavailable dates with booking dates
    const unavailable_dates = [
      ...property.unavailable_dates,
      ...bookings.map((booking) => ({
        start_date: booking.check_in_date,
        end_date: booking.check_out_date,
        reason: "Booking",
      })),
    ];

    res.status(200).json({
      success: true,
      data: {
        unavailable_dates,
      },
    });
  },
};

// Helper function to calculate occupancy rate
async function calculateOccupancyRate(propertyIds, startDate) {
  const bookings = await Booking.find({
    property_id: { $in: propertyIds },
    booking_status: { $in: ["confirmed", "completed"] },
    check_in_date: { $gte: startDate },
  });

  const totalDays = propertyIds.length * 30; // Total available days across all properties
  const bookedDays = bookings.reduce((sum, booking) => {
    const checkIn = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);
    return sum + Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  }, 0);

  return totalDays > 0 ? (bookedDays / totalDays) * 100 : 0;
}

// Helper function to calculate individual property performance
async function calculatePropertyPerformance(propertyIds, startDate) {
  const performance = [];

  for (const propertyId of propertyIds) {
    const bookings = await Booking.find({
      property_id: propertyId,
      createdAt: { $gte: startDate },
    }).populate("property_id");

    const property = await Property.findById(propertyId);

    performance.push({
      property_id: propertyId,
      property_name: property.property_name,
      total_bookings: bookings.length,
      revenue: bookings
        .filter((b) => b.booking_status === "completed")
        .reduce((sum, booking) => sum + booking.total_price, 0),
      average_rating: property.average_rating || 0,
      occupancy_rate: await calculateOccupancyRate([propertyId], startDate),
    });
  }

  return performance;
}

// Helper function to get recent activity
async function getRecentActivity(propertyIds, startDate) {
  return await Booking.find({
    property_id: { $in: propertyIds },
    createdAt: { $gte: startDate },
  })
    .populate("property_id", "property_name")
    .populate("guest", "name email")
    .select("booking_status check_in_date check_out_date total_price createdAt")
    .sort({ createdAt: -1 })
    .limit(10);
}

module.exports = propertyController;
