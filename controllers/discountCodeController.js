const DiscountCode = require("../models/discountCode");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");

// Get all discount codes (Admin only)
const getAllDiscountCodes = async (req, res) => {
  const { page = 1, limit = 10, is_active } = req.query;
  
  const filter = {};
  if (is_active !== undefined) {
    filter.is_active = is_active === "true";
  }

  const discountCodes = await DiscountCode.find(filter)
    .populate("created_by", "first_name last_name email")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await DiscountCode.countDocuments(filter);

  res.status(StatusCodes.OK).json({
    discount_codes: discountCodes,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
  });
};

// Get discount code by ID (Admin only)
const getDiscountCodeById = async (req, res) => {
  const { id } = req.params;

  const discountCode = await DiscountCode.findById(id)
    .populate("created_by", "first_name last_name email")
    .populate("used_by.user_id", "first_name last_name email short_id");

  if (!discountCode) {
    throw new NotFoundError("Discount code not found");
  }

  res.status(StatusCodes.OK).json({
    discount_code: discountCode,
  });
};

// Create new discount code (Admin only)
const createDiscountCode = async (req, res) => {
  const {
    code,
    description,
    discount_type,
    discount_value,
    applicable_to = "registration_fee",
    max_uses,
    valid_from,
    valid_until,
  } = req.body;

  // Check if code already exists
  const existingCode = await DiscountCode.findOne({ code: code.toUpperCase() });
  if (existingCode) {
    throw new BadRequestError("Discount code already exists");
  }

  const discountCode = await DiscountCode.create({
    code: code.toUpperCase(),
    description,
    discount_type,
    discount_value,
    applicable_to,
    max_uses,
    valid_from: valid_from ? new Date(valid_from) : new Date(),
    valid_until: valid_until ? new Date(valid_until) : null,
    created_by: req.user._id,
  });

  res.status(StatusCodes.CREATED).json({
    message: "Discount code created successfully",
    discount_code: discountCode,
  });
};

// Update discount code (Admin only)
const updateDiscountCode = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Don't allow updating the code itself or usage stats
  delete updateData.code;
  delete updateData.current_uses;
  delete updateData.used_by;
  delete updateData.created_by;

  const discountCode = await DiscountCode.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!discountCode) {
    throw new NotFoundError("Discount code not found");
  }

  res.status(StatusCodes.OK).json({
    message: "Discount code updated successfully",
    discount_code: discountCode,
  });
};

// Delete discount code (Admin only)
const deleteDiscountCode = async (req, res) => {
  const { id } = req.params;

  const discountCode = await DiscountCode.findByIdAndDelete(id);

  if (!discountCode) {
    throw new NotFoundError("Discount code not found");
  }

  res.status(StatusCodes.OK).json({
    message: "Discount code deleted successfully",
  });
};

// Toggle discount code status (Admin only)
const toggleDiscountCodeStatus = async (req, res) => {
  const { id } = req.params;

  const discountCode = await DiscountCode.findById(id);

  if (!discountCode) {
    throw new NotFoundError("Discount code not found");
  }

  discountCode.is_active = !discountCode.is_active;
  await discountCode.save();

  res.status(StatusCodes.OK).json({
    message: `Discount code ${discountCode.is_active ? "activated" : "deactivated"} successfully`,
    discount_code: discountCode,
  });
};

// Get discount code usage statistics (Admin only)
const getDiscountCodeStats = async (req, res) => {
  const stats = await DiscountCode.aggregate([
    {
      $group: {
        _id: null,
        total_codes: { $sum: 1 },
        active_codes: {
          $sum: { $cond: [{ $eq: ["$is_active", true] }, 1, 0] },
        },
        total_uses: { $sum: "$current_uses" },
        total_discount_given: {
          $sum: {
            $reduce: {
              input: "$used_by",
              initialValue: 0,
              in: { $add: ["$$value", "$$this.discount_amount"] },
            },
          },
        },
      },
    },
  ]);

  const result = stats[0] || {
    total_codes: 0,
    active_codes: 0,
    total_uses: 0,
    total_discount_given: 0,
  };

  res.status(StatusCodes.OK).json({
    stats: result,
  });
};

module.exports = {
  getAllDiscountCodes,
  getDiscountCodeById,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  toggleDiscountCodeStatus,
  getDiscountCodeStats,
};
