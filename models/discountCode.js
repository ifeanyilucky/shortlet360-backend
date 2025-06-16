const mongoose = require("mongoose");

const discountCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    discount_type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discount_value: {
      type: Number,
      required: true,
      min: 0,
    },
    applicable_to: {
      type: String,
      enum: ["registration_fee", "all"],
      default: "registration_fee",
    },
    max_uses: {
      type: Number,
      default: null, // null means unlimited
    },
    current_uses: {
      type: Number,
      default: 0,
    },
    used_by: [
      {
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        used_at: {
          type: Date,
          default: Date.now,
        },
        original_amount: Number,
        discount_amount: Number,
        final_amount: Number,
      },
    ],
    is_active: {
      type: Boolean,
      default: true,
    },
    valid_from: {
      type: Date,
      default: Date.now,
    },
    valid_until: {
      type: Date,
      default: null, // null means no expiry
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Index for efficient code lookups
discountCodeSchema.index({ code: 1, is_active: 1 });

// Method to check if discount code is valid
discountCodeSchema.methods.isValid = function () {
  const now = new Date();
  
  // Check if code is active
  if (!this.is_active) {
    return { valid: false, reason: "Discount code is not active" };
  }
  
  // Check if code has started
  if (this.valid_from && now < this.valid_from) {
    return { valid: false, reason: "Discount code is not yet valid" };
  }
  
  // Check if code has expired
  if (this.valid_until && now > this.valid_until) {
    return { valid: false, reason: "Discount code has expired" };
  }
  
  // Check usage limits
  if (this.max_uses && this.current_uses >= this.max_uses) {
    return { valid: false, reason: "Discount code usage limit reached" };
  }
  
  return { valid: true };
};

// Method to calculate discount
discountCodeSchema.methods.calculateDiscount = function (originalAmount) {
  if (this.discount_type === "percentage") {
    const discountAmount = (originalAmount * this.discount_value) / 100;
    return {
      original_amount: originalAmount,
      discount_amount: discountAmount,
      final_amount: originalAmount - discountAmount,
      discount_percentage: this.discount_value,
    };
  } else if (this.discount_type === "fixed") {
    const discountAmount = Math.min(this.discount_value, originalAmount);
    return {
      original_amount: originalAmount,
      discount_amount: discountAmount,
      final_amount: originalAmount - discountAmount,
      discount_percentage: ((discountAmount / originalAmount) * 100).toFixed(2),
    };
  }
};

// Method to apply discount (increment usage)
discountCodeSchema.methods.applyDiscount = function (userId, discountDetails) {
  this.current_uses += 1;
  this.used_by.push({
    user_id: userId,
    used_at: new Date(),
    original_amount: discountDetails.original_amount,
    discount_amount: discountDetails.discount_amount,
    final_amount: discountDetails.final_amount,
  });
  return this.save();
};

module.exports = mongoose.model("DiscountCode", discountCodeSchema);
