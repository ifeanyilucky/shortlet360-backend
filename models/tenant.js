const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    property_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lease_start_date: { type: Date, required: true },
    lease_end_date: { type: Date, required: true },
    monthly_rent: { type: Number, required: true },
    annual_rent: { type: Number, required: true },
    security_deposit: { type: Number, required: true },
    agency_fee: { type: Number, default: 0 },
    commission_fee: { type: Number, default: 0 },
    legal_fee: { type: Number, default: 0 },
    total_initial_payment: { type: Number, required: true },
    payment_status: {
      type: String,
      enum: ["pending", "paid", "overdue", "cancelled"],
      default: "pending",
    },
    lease_status: {
      type: String,
      enum: ["active", "expired", "terminated", "pending"],
      default: "pending",
    },
    payment: Object, // Paystack payment reference
    payment_method: {
      type: String,
      enum: ["paystack", "flutterwave", "bank_transfer"],
      default: "paystack",
    },
    payment_reference: String,
    tenant_count: { type: Number, required: true },

    // Enhanced tenant information
    tenant_phone: { type: String, required: true },
    tenant_relationship: { type: String, required: true },
    next_of_kin: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      relationship: { type: String, required: true },
      address: { type: String, required: true },
    },
    employment_info: {
      employer_name: { type: String, required: true },
      job_title: { type: String, required: true },
      monthly_income: { type: Number, required: true },
      employment_type: {
        type: String,
        enum: [
          "full_time",
          "part_time",
          "self_employed",
          "student",
          "unemployed",
        ],
        required: true,
      },
    },
    emergency_contact: {
      name: String,
      phone: String,
      relationship: String,
    },
    special_requests: String,
    documents: [
      {
        type: { type: String, required: true }, // "id_card", "utility_bill", "employment_letter", etc.
        url: String,
        public_id: String,
        uploaded_at: { type: Date, default: Date.now },
      },
    ],
    rent_payment_history: [
      {
        month: { type: String, required: true }, // "YYYY-MM" format
        amount: { type: Number, required: true },
        payment_date: { type: Date, required: true },
        payment_reference: String,
        status: {
          type: String,
          enum: ["paid", "pending", "overdue"],
          default: "pending",
        },
      },
    ],
    maintenance_requests: [
      {
        title: String,
        description: String,
        priority: {
          type: String,
          enum: ["low", "medium", "high", "urgent"],
          default: "medium",
        },
        status: {
          type: String,
          enum: ["pending", "in_progress", "completed", "cancelled"],
          default: "pending",
        },
        created_at: { type: Date, default: Date.now },
        completed_at: Date,
      },
    ],
    lease_agreement_url: String,
    lease_agreement_public_id: String,
    notes: String, // For property owner's private notes
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for efficient queries
tenantSchema.index({ property_id: 1, lease_status: 1 });
tenantSchema.index({ tenant: 1, lease_status: 1 });
tenantSchema.index({ "rent_payment_history.month": 1 });

// Virtual for calculating remaining lease days
tenantSchema.virtual("remaining_days").get(function () {
  if (!this.lease_end_date) return 0;
  const today = new Date();
  const endDate = new Date(this.lease_end_date);
  const diffTime = endDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for checking if lease is expired
tenantSchema.virtual("is_expired").get(function () {
  if (!this.lease_end_date) return false;
  return new Date() > new Date(this.lease_end_date);
});

// Virtual for checking if lease is active
tenantSchema.virtual("is_lease_active").get(function () {
  if (!this.lease_start_date || !this.lease_end_date) return false;
  const today = new Date();
  const startDate = new Date(this.lease_start_date);
  const endDate = new Date(this.lease_end_date);
  return today >= startDate && today <= endDate;
});

// Method to add rent payment
tenantSchema.methods.addRentPayment = function (
  month,
  amount,
  paymentReference
) {
  this.rent_payment_history.push({
    month,
    amount,
    payment_date: new Date(),
    payment_reference: paymentReference,
    status: "paid",
  });
  return this.save();
};

// Method to check if rent is paid for a specific month
tenantSchema.methods.isRentPaidForMonth = function (month) {
  return this.rent_payment_history.some(
    (payment) => payment.month === month && payment.status === "paid"
  );
};

// Pre-save middleware to update lease status
tenantSchema.pre("save", function (next) {
  if (this.lease_start_date && this.lease_end_date) {
    const today = new Date();
    const startDate = new Date(this.lease_start_date);
    const endDate = new Date(this.lease_end_date);

    if (today < startDate) {
      this.lease_status = "pending";
    } else if (today >= startDate && today <= endDate) {
      this.lease_status = "active";
    } else if (today > endDate) {
      this.lease_status = "expired";
    }
  }
  next();
});

module.exports = mongoose.model("Tenant", tenantSchema);
