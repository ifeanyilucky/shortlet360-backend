const User = require("../models/user");
const Property = require("../models/property");
const Booking = require("../models/booking");
const Referral = require("../models/referral");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");

// Dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // Get counts
    const userCount = await User.countDocuments({ role: "user" });
    const ownerCount = await User.countDocuments({ role: "owner" });
    const propertyCount = await Property.countDocuments();
    const bookingCount = await Booking.countDocuments();
    const referralCount = await Referral.countDocuments();

    // Get recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("first_name last_name email role short_id createdAt");

    // Get recent properties
    const recentProperties = await Property.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("property_name property_category location short_id createdAt")
      .populate("owner", "first_name last_name short_id");

    // Get recent bookings
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "check_in_date check_out_date total_price booking_status payment_status createdAt"
      )
      .populate("property_id", "property_name short_id")
      .populate("guest", "first_name last_name short_id");

    // Get pending KYC verifications
    const pendingKycCount = await User.countDocuments({
      $or: [
        { "kyc.tier1.status": "pending" },
        { "kyc.tier2.status": "pending" },
        { "kyc.tier3.status": "pending" },
      ],
    });

    // Get revenue statistics
    const totalRevenue = await Booking.aggregate([
      { $match: { payment_status: "paid" } },
      { $group: { _id: null, total: { $sum: "$total_price" } } },
    ]);

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    res.status(StatusCodes.OK).json({
      stats: {
        userCount,
        ownerCount,
        propertyCount,
        bookingCount,
        pendingKycCount,
        referralCount,
        revenue,
      },
      recentUsers,
      recentProperties,
      recentBookings,
    });
  } catch (error) {
    throw new BadRequestError(error.message);
  }
};

// User management
const getAllUsers = async (req, res) => {
  const { role, search, page = 1, limit = 10 } = req.query;

  const query = {};

  if (role) {
    query.role = role;
  }

  if (search) {
    query.$or = [
      { first_name: { $regex: search, $options: "i" } },
      { last_name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { short_id: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select("-password");

  const totalUsers = await User.countDocuments(query);

  res.status(StatusCodes.OK).json({
    users,
    pagination: {
      total: totalUsers,
      page: parseInt(page),
      pages: Math.ceil(totalUsers / limit),
      limit: parseInt(limit),
    },
  });
};

const getUserById = async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select("-password");

  if (!user) {
    throw new NotFoundError(`No user with id ${id}`);
  }

  res.status(StatusCodes.OK).json({ user });
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, email, phone_number, business_name } =
    req.body;

  const user = await User.findByIdAndUpdate(
    id,
    { first_name, last_name, email, phone_number, business_name },
    { new: true, runValidators: true }
  ).select("-password");

  if (!user) {
    throw new NotFoundError(`No user with id ${id}`);
  }

  res.status(StatusCodes.OK).json({ user });
};

const deleteUser = async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndDelete(id);

  if (!user) {
    throw new NotFoundError(`No user with id ${id}`);
  }

  res.status(StatusCodes.OK).json({ message: "User deleted successfully" });
};

const verifyUser = async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndUpdate(
    id,
    { is_verified: true },
    { new: true, runValidators: true }
  ).select("-password");

  if (!user) {
    throw new NotFoundError(`No user with id ${id}`);
  }

  res.status(StatusCodes.OK).json({ user });
};

const activateUser = async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndUpdate(
    id,
    {
      is_active: true,
      registration_payment_status: "paid",
    },
    { new: true, runValidators: true }
  ).select("-password");

  if (!user) {
    throw new NotFoundError(`No user with id ${id}`);
  }

  res.status(StatusCodes.OK).json({ user });
};

// Property management
const getAllProperties = async (req, res) => {
  const { category, search, page = 1, limit = 10 } = req.query;

  const query = {};

  if (category) {
    query.property_category = category;
  }

  if (search) {
    query.$or = [
      { property_name: { $regex: search, $options: "i" } },
      { short_id: { $regex: search, $options: "i" } },
      { "location.city": { $regex: search, $options: "i" } },
      { "location.state": { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const properties = await Property.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("owner", "first_name last_name short_id");

  const totalProperties = await Property.countDocuments(query);

  res.status(StatusCodes.OK).json({
    properties,
    pagination: {
      total: totalProperties,
      page: parseInt(page),
      pages: Math.ceil(totalProperties / limit),
      limit: parseInt(limit),
    },
  });
};

const getPropertyById = async (req, res) => {
  const { id } = req.params;

  const property = await Property.findById(id).populate(
    "owner",
    "first_name last_name email phone_number short_id"
  );

  if (!property) {
    throw new NotFoundError(`No property with id ${id}`);
  }

  res.status(StatusCodes.OK).json({ property });
};

const updateProperty = async (req, res) => {
  const { id } = req.params;

  const property = await Property.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!property) {
    throw new NotFoundError(`No property with id ${id}`);
  }

  res.status(StatusCodes.OK).json({ property });
};

const deleteProperty = async (req, res) => {
  const { id } = req.params;

  const property = await Property.findByIdAndDelete(id);

  if (!property) {
    throw new NotFoundError(`No property with id ${id}`);
  }

  res.status(StatusCodes.OK).json({ message: "Property deleted successfully" });
};

const activateProperty = async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  const property = await Property.findByIdAndUpdate(
    id,
    { is_active },
    { new: true, runValidators: true }
  );

  if (!property) {
    throw new NotFoundError(`No property with id ${id}`);
  }

  res.status(StatusCodes.OK).json({ property });
};

// Booking management
const getAllBookings = async (req, res) => {
  const { status, search, page = 1, limit = 10 } = req.query;

  const query = {};

  if (status) {
    query.booking_status = status;
  }

  if (search) {
    // We need to find bookings by property name or guest name
    // This requires a more complex query with aggregation
    // For simplicity, we'll just search by ID for now
    query._id = search;
  }

  const skip = (page - 1) * limit;

  const bookings = await Booking.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("property_id", "property_name short_id")
    .populate("guest", "first_name last_name short_id");

  const totalBookings = await Booking.countDocuments(query);

  res.status(StatusCodes.OK).json({
    bookings,
    pagination: {
      total: totalBookings,
      page: parseInt(page),
      pages: Math.ceil(totalBookings / limit),
      limit: parseInt(limit),
    },
  });
};

const getBookingById = async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id)
    .populate("property_id")
    .populate("guest", "-password");

  if (!booking) {
    throw new NotFoundError(`No booking with id ${id}`);
  }

  res.status(StatusCodes.OK).json({ booking });
};

const updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { booking_status, payment_status } = req.body;

  const updateData = {};

  if (booking_status) {
    updateData.booking_status = booking_status;
  }

  if (payment_status) {
    updateData.payment_status = payment_status;
  }

  const booking = await Booking.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!booking) {
    throw new NotFoundError(`No booking with id ${id}`);
  }

  res.status(StatusCodes.OK).json({ booking });
};

// KYC verification management
const getPendingKycVerifications = async (req, res) => {
  const { tier, search, page = 1, limit = 10 } = req.query;

  const query = {};

  // Filter by tier
  if (tier === "1") {
    query["kyc.tier1.status"] = "pending";
  } else if (tier === "2") {
    query["kyc.tier2.status"] = "pending";
  } else if (tier === "3") {
    query["kyc.tier3.status"] = "pending";
  } else {
    // If no tier specified, get all pending verifications
    query.$or = [
      { "kyc.tier1.status": "pending" },
      { "kyc.tier2.status": "pending" },
      { "kyc.tier3.status": "pending" },
    ];
  }

  // Add search functionality
  if (search) {
    const searchQuery = {
      $or: [
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { short_id: { $regex: search, $options: "i" } },
        { phone_number: { $regex: search, $options: "i" } },
      ],
    };

    // Combine tier filter with search filter
    if (query.$or) {
      // If we already have an $or for tier filtering, we need to use $and
      query.$and = [{ $or: query.$or }, searchQuery];
      delete query.$or;
    } else {
      // If we have a specific tier filter, combine it with search
      query.$and = [{ ...query }, searchQuery];
      // Remove the tier-specific query from the main query object
      Object.keys(query).forEach((key) => {
        if (key.startsWith("kyc.")) {
          delete query[key];
        }
      });
    }
  }

  const skip = (page - 1) * limit;

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select("first_name last_name email role short_id phone_number kyc");

  const totalUsers = await User.countDocuments(query);

  res.status(StatusCodes.OK).json({
    users,
    pagination: {
      total: totalUsers,
      page: parseInt(page),
      pages: Math.ceil(totalUsers / limit),
      limit: parseInt(limit),
    },
  });
};
// Unified KYC verification endpoint that handles all filtering
const getUnifiedKycVerifications = async (req, res) => {
  const { tier, search, status, page = 1, limit = 10 } = req.query;

  let query = {};

  // Build the base query based on status filter
  if (status === "verified") {
    // Only show users with at least one verified tier
    query.$or = [
      { "kyc.tier1.status": "verified" },
      { "kyc.tier2.status": "verified" },
      { "kyc.tier3.status": "verified" },
    ];
  } else if (status === "pending") {
    // Only show users with at least one pending tier
    query.$or = [
      { "kyc.tier1.status": "pending" },
      { "kyc.tier2.status": "pending" },
      { "kyc.tier3.status": "pending" },
    ];
  } else if (status === "rejected") {
    // Only show users with at least one rejected tier
    query.$or = [
      { "kyc.tier1.status": "rejected" },
      { "kyc.tier2.status": "rejected" },
      { "kyc.tier3.status": "rejected" },
    ];
  } else {
    // For "all" status, show users who have any KYC data
    query.$or = [
      { "kyc.tier1": { $exists: true } },
      { "kyc.tier2": { $exists: true } },
      { "kyc.tier3": { $exists: true } },
    ];
  }

  // Refine query based on specific tier
  if (tier === "1") {
    if (status && status !== "all") {
      query = { "kyc.tier1.status": status };
    } else {
      query = { "kyc.tier1": { $exists: true } };
    }
  } else if (tier === "2") {
    if (status && status !== "all") {
      query = { "kyc.tier2.status": status };
    } else {
      query = { "kyc.tier2": { $exists: true } };
    }
  } else if (tier === "3") {
    if (status && status !== "all") {
      query = { "kyc.tier3.status": status };
    } else {
      query = { "kyc.tier3": { $exists: true } };
    }
  }

  // Add search functionality
  if (search) {
    const searchQuery = {
      $or: [
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { short_id: { $regex: search, $options: "i" } },
        { phone_number: { $regex: search, $options: "i" } },
      ],
    };

    // Combine existing filters with search filter using $and
    query = {
      $and: [query, searchQuery],
    };
  }

  const skip = (page - 1) * limit;

  try {
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("first_name last_name email role short_id phone_number kyc");

    const totalUsers = await User.countDocuments(query);

    res.status(StatusCodes.OK).json({
      users,
      pagination: {
        total: totalUsers,
        page: parseInt(page),
        pages: Math.ceil(totalUsers / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error in getUnifiedKycVerifications:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch KYC verifications",
      error: error.message,
    });
  }
};

const getAllKycVerifications = async (req, res) => {
  const { tier, search, status, page = 1, limit = 10 } = req.query;

  const query = {};

  // Filter by verification status (verified, pending, rejected, or all)
  if (status === "verified") {
    // Only show users with at least one verified tier
    query.$or = [
      { "kyc.tier1.status": "verified" },
      { "kyc.tier2.status": "verified" },
      { "kyc.tier3.status": "verified" },
    ];
  } else if (status === "pending") {
    // Only show users with at least one pending tier
    query.$or = [
      { "kyc.tier1.status": "pending" },
      { "kyc.tier2.status": "pending" },
      { "kyc.tier3.status": "pending" },
    ];
  } else if (status === "rejected") {
    // Only show users with at least one rejected tier
    query.$or = [
      { "kyc.tier1.status": "rejected" },
      { "kyc.tier2.status": "rejected" },
      { "kyc.tier3.status": "rejected" },
    ];
  }
  // If status is "all" or not specified, don't add status filter

  // Filter by specific tier
  if (tier === "1") {
    if (status && status !== "all") {
      query["kyc.tier1.status"] = status;
      delete query.$or; // Remove the general status filter
    } else {
      query["kyc.tier1"] = { $exists: true };
    }
  } else if (tier === "2") {
    if (status && status !== "all") {
      query["kyc.tier2.status"] = status;
      delete query.$or; // Remove the general status filter
    } else {
      query["kyc.tier2"] = { $exists: true };
    }
  } else if (tier === "3") {
    if (status && status !== "all") {
      query["kyc.tier3.status"] = status;
      delete query.$or; // Remove the general status filter
    } else {
      query["kyc.tier3"] = { $exists: true };
    }
  }

  // Add search functionality
  if (search) {
    const searchQuery = {
      $or: [
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { short_id: { $regex: search, $options: "i" } },
        { phone_number: { $regex: search, $options: "i" } },
      ],
    };

    // Combine existing filters with search filter
    if (query.$or || Object.keys(query).length > 0) {
      const existingQuery = { ...query };
      query.$and = [existingQuery, searchQuery];
      // Clear the original query properties to avoid duplication
      Object.keys(existingQuery).forEach((key) => {
        delete query[key];
      });
    } else {
      Object.assign(query, searchQuery);
    }
  }

  const skip = (page - 1) * limit;

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select("first_name last_name email role short_id phone_number kyc");

  const totalUsers = await User.countDocuments(query);

  res.status(StatusCodes.OK).json({
    users,
    pagination: {
      total: totalUsers,
      page: parseInt(page),
      pages: Math.ceil(totalUsers / limit),
      limit: parseInt(limit),
    },
  });
};

const updateTier1Verification = async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  if (!["verified", "rejected"].includes(status)) {
    throw new BadRequestError("Status must be either 'verified' or 'rejected'");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError(`No user with id ${userId}`);
  }

  user.kyc.tier1.status = status;

  if (status === "verified") {
    user.kyc.tier1.completed_at = new Date();

    // Check if user was referred and verify the referral
    if (user.referral?.referred_by) {
      try {
        const referral = await Referral.findOne({
          referred_user: user._id,
          status: "pending",
        });

        if (referral) {
          await referral.markAsVerified();
          console.log(`Referral verified for user ${user._id}`);
        }
      } catch (error) {
        console.error("Error verifying referral:", error);
        // Don't fail the KYC verification if referral verification fails
      }
    }
  }

  await user.save();

  res.status(StatusCodes.OK).json({
    message: `Tier 1 verification ${status}`,
    user: {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      short_id: user.short_id,
      kyc: user.kyc,
    },
  });
};

const updateTier2Verification = async (req, res) => {
  const { userId } = req.params;
  const { status, admin_notes } = req.body;

  if (!["verified", "rejected"].includes(status)) {
    throw new BadRequestError("Status must be either 'verified' or 'rejected'");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError(`No user with id ${userId}`);
  }

  if (!user.kyc?.tier2?.utility_bill) {
    throw new BadRequestError("No utility bill found for this user");
  }

  // Update utility bill verification status
  user.kyc.tier2.utility_bill.verification_status = status;
  user.kyc.tier2.utility_bill.reviewed_by = req.user._id;
  user.kyc.tier2.utility_bill.reviewed_at = new Date();

  if (admin_notes) {
    user.kyc.tier2.utility_bill.admin_notes = admin_notes;
  }

  // Update overall Tier 2 status
  user.kyc.tier2.status = status;

  if (status === "verified") {
    user.kyc.tier2.completed_at = new Date();
  }

  await user.save();

  res.status(StatusCodes.OK).json({
    message: `Tier 2 verification ${status}`,
    user: {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      short_id: user.short_id,
      kyc: user.kyc,
    },
  });
};

const updateTier3Verification = async (req, res) => {
  const { userId } = req.params;
  const { status, employmentStatus, bankStatementStatus } = req.body;

  if (status && !["verified", "rejected"].includes(status)) {
    throw new BadRequestError("Status must be either 'verified' or 'rejected'");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError(`No user with id ${userId}`);
  }

  if (status) {
    user.kyc.tier3.status = status;

    if (status === "verified") {
      user.kyc.tier3.completed_at = new Date();
    }
  }

  if (employmentStatus) {
    user.kyc.tier3.employment.verification_status = employmentStatus;
  }

  if (bankStatementStatus) {
    user.kyc.tier3.bank_statement.verification_status = bankStatementStatus;
  }

  await user.save();

  res.status(StatusCodes.OK).json({
    message: `Tier 3 verification updated`,
    user: {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      short_id: user.short_id,
      kyc: user.kyc,
    },
  });
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  verifyUser,
  activateUser,
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  activateProperty,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  getPendingKycVerifications,
  updateTier1Verification,
  updateTier2Verification,
  updateTier3Verification,
  getAllKycVerifications,
  getUnifiedKycVerifications,
};
