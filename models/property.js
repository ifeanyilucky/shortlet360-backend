const mongoose = require("mongoose");

const shortletPricingSchema = {
  base_price: { type: Number, default: 0 },
  cleaning_fee: { type: Number, default: 0 },
  security_deposit: { type: Number, default: 0 },
  is_active: { type: Boolean, default: false },
};

const rentalPricingSchema = {
  annual_rent: { type: Number, default: 0 },
  agency_fee: { type: Number, default: 0 },
  commission_fee: { type: Number, default: 0 },
  caution_fee: { type: Number, default: 0 },
  legal_fee: { type: Number, default: 0 },
  is_agency_fee_active: { type: Boolean, default: true },
  is_commission_fee_active: { type: Boolean, default: true },
  is_caution_fee_active: { type: Boolean, default: true },
  is_legal_fee_active: { type: Boolean, default: true },
  is_active: { type: Boolean, default: false },
};

const propertySchema = new mongoose.Schema(
  {
    property_name: { type: String, required: true },
    property_description: { type: String, required: true },
    pricing: {
      per_day: shortletPricingSchema,
      per_week: shortletPricingSchema,
      per_month: shortletPricingSchema,
      rent_per_year: rentalPricingSchema,
    },
    location: {
      street_address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    amenities: [String],
    house_rules: [String],
    property_images: [
      {
        url: String,
        public_id: String,
        asset_id: String,
      },
    ],
    property_type: { type: String, required: true },
    property_category: {
      type: String,
      required: true,
      enum: ["shortlet", "rent"],
      default: "shortlet",
    },
    bedroom_count: { type: Number, required: true },
    bathroom_count: { type: Number, required: true },
    max_guests: { type: Number, required: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    is_active: { type: Boolean, default: true },
    unavailable_dates: [
      {
        start_date: Date,
        end_date: Date,
        reason: { type: String, default: "External booking" },
      },
    ],
    short_id: {
      type: String,
      unique: true,
      required: true,
    },
  },
  { timestamps: true }
);

// Update validation for the new pricing structure
propertySchema.pre("save", function (next) {
  const pricing = this.pricing;

  if (this.property_category === "shortlet") {
    // Shortlet properties must have per_day or per_week pricing active
    if (!pricing.per_day.is_active && !pricing.per_week.is_active) {
      return next(
        new Error(
          "Shortlet properties must have daily or weekly pricing active"
        )
      );
    }

    // Validate that shortlet prices are set when active
    if (pricing.per_day.is_active && pricing.per_day.base_price <= 0) {
      return next(new Error("Daily base price must be greater than 0"));
    }
    if (pricing.per_week.is_active && pricing.per_week.base_price <= 0) {
      return next(new Error("Weekly base price must be greater than 0"));
    }
    if (pricing.per_month.is_active && pricing.per_month.base_price <= 0) {
      return next(new Error("Monthly base price must be greater than 0"));
    }
  } else if (this.property_category === "rent") {
    // Rent properties must have yearly pricing active
    if (!pricing.rent_per_year.is_active) {
      return next(new Error("Rent properties must have yearly pricing active"));
    }

    // Validate that annual rent is set
    if (pricing.rent_per_year.annual_rent <= 0) {
      return next(new Error("Annual rent must be greater than 0"));
    }

    // Validate that active fees have values
    if (
      pricing.rent_per_year.is_agency_fee_active &&
      pricing.rent_per_year.agency_fee <= 0
    ) {
      return next(new Error("Agency fee must be greater than 0 when active"));
    }
    if (
      pricing.rent_per_year.is_commission_fee_active &&
      pricing.rent_per_year.commission_fee <= 0
    ) {
      return next(
        new Error("Commission fee must be greater than 0 when active")
      );
    }
    if (
      pricing.rent_per_year.is_caution_fee_active &&
      pricing.rent_per_year.caution_fee <= 0
    ) {
      return next(new Error("Caution fee must be greater than 0 when active"));
    }
    if (
      pricing.rent_per_year.is_legal_fee_active &&
      pricing.rent_per_year.legal_fee <= 0
    ) {
      return next(new Error("Legal fee must be greater than 0 when active"));
    }
  }

  next();
});

module.exports = mongoose.model("Property", propertySchema);
