const mongoose = require("mongoose");

const pricingTypeSchema = {
    base_price: { type: Number, default: 0 },
    cleaning_fee: { type: Number, default: 0 },
    security_deposit: { type: Number, default: 0 },
    is_active: { type: Boolean, default: false }
};

const propertySchema = new mongoose.Schema({
    property_name: { type: String, required: true },
    property_description: { type: String, required: true },
    pricing: {
        per_day: pricingTypeSchema,
        per_week: pricingTypeSchema,
        per_month: pricingTypeSchema
    },
    location: {
        street_address: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true },
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    amenities: [String],
    house_rules: [String],
    property_images: [{
        url: String,
        public_id: String,
        asset_id: String
    }],
    property_type: { type: String, required: true },
    bedroom_count: { type: Number, required: true },
    bathroom_count: { type: Number, required: true },
    max_guests: { type: Number, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    is_active: { type: Boolean, default: true },
    available_dates: [{
        start_date: Date,
        end_date: Date
    }]
},
    { timestamps: true }
);

// Validate that at least one pricing type is active
propertySchema.pre('save', function (next) {
    const pricing = this.pricing;
    if (!pricing.per_day.is_active &&
        !pricing.per_week.is_active &&
        !pricing.per_month.is_active) {
        next(new Error('At least one pricing type must be active'));
    }
    next();
});

module.exports = mongoose.model("Property", propertySchema);
