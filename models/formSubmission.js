const mongoose = require("mongoose");

// Base schema for common fields across all forms
const baseFormSchema = {
  submission_id: {
    type: String,
    unique: true,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "in_progress", "resolved", "closed"],
    default: "pending",
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium",
  },
  admin_notes: String,
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  resolved_at: Date,
  resolved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
};

// Home Service Request Schema
const homeServiceSchema = new mongoose.Schema(
  {
    ...baseFormSchema,
    form_type: {
      type: String,
      default: "home_service",
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    service: { type: String, required: true },
    custom_service: String,
    description: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      area: { type: String, required: true },
      local_government: { type: String, required: true },
      state: { type: String, required: true },
    },
  },
  { timestamps: true }
);

// Artisan Application Schema
const artisanApplicationSchema = new mongoose.Schema(
  {
    ...baseFormSchema,
    form_type: {
      type: String,
      default: "artisan_application",
    },
    full_name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      area: { type: String, required: true },
      local_government: { type: String, required: true },
      state: { type: String, required: true },
    },
    skill_category: { type: String, required: true },
    experience: { type: String, required: true },
    id_type: { type: String, required: true },
    id_number: { type: String, required: true },
    about: { type: String, required: true },
  },
  { timestamps: true }
);

// Contact Form Schema
const contactFormSchema = new mongoose.Schema(
  {
    ...baseFormSchema,
    form_type: {
      type: String,
      default: "contact",
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    subject: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

// Dispute Resolution Schema
const disputeResolutionSchema = new mongoose.Schema(
  {
    ...baseFormSchema,
    form_type: {
      type: String,
      default: "dispute_resolution",
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    action_type: {
      type: String,
      enum: ["report", "dispute"],
      required: true,
    },
    dispute_type: { type: String, required: true },
    booking_reference: String,
    property_name: String,
    other_party_id: String,
    description: { type: String, required: true },
    urgency_level: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
    },
    user_role: String,
    payment_reference: String,
    payment_status: String,
    amount: Number,
  },
  { timestamps: true }
);

// Inspection Request Schema
const inspectionRequestSchema = new mongoose.Schema(
  {
    ...baseFormSchema,
    form_type: {
      type: String,
      default: "inspection_request",
    },
    full_name: { type: String, required: true },
    phone_number: { type: String, required: true },
    property_id: { type: String, required: true },
    owner_email: { type: String, required: true },
    preferred_dates: {
      date1: { type: Date, required: true },
      date2: { type: Date, required: true },
      date3: { type: Date, required: true },
    },
  },
  { timestamps: true }
);

// Property Management Application Schema
const propertyManagementSchema = new mongoose.Schema(
  {
    ...baseFormSchema,
    form_type: {
      type: String,
      default: "property_management",
    },
    full_name: { type: String, required: true },
    email: { type: String, required: true },
    phone_number: { type: String, required: true },
    property_type: { type: String, required: true },
    number_of_properties: { type: Number, required: true },
    address: {
      street: { type: String, required: true },
      area: { type: String, required: true },
      local_government: { type: String, required: true },
      state: { type: String, required: true },
    },
    agree_to_fee: { type: Boolean, required: true },
  },
  { timestamps: true }
);

// RNPL Waitlist Schema
const rnplWaitlistSchema = new mongoose.Schema(
  {
    ...baseFormSchema,
    form_type: {
      type: String,
      default: "rnpl_waitlist",
    },
    full_name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    occupation: { type: String, required: true },
    address: { type: String, required: true },
    job_type: {
      type: String,
      required: true,
      enum: ["Employed", "Self-Employed", "Business Owner"],
    },
    monthly_income: String,
    current_rent_amount: String,
    preferred_location: String,
  },
  { timestamps: true }
);

// Create indexes for better performance
homeServiceSchema.index({ email: 1, createdAt: -1 });
homeServiceSchema.index({ status: 1 });
homeServiceSchema.index({ submission_id: 1 });

artisanApplicationSchema.index({ email: 1, createdAt: -1 });
artisanApplicationSchema.index({ status: 1 });
artisanApplicationSchema.index({ submission_id: 1 });

contactFormSchema.index({ email: 1, createdAt: -1 });
contactFormSchema.index({ status: 1 });
contactFormSchema.index({ submission_id: 1 });

disputeResolutionSchema.index({ email: 1, createdAt: -1 });
disputeResolutionSchema.index({ status: 1, action_type: 1 });
disputeResolutionSchema.index({ submission_id: 1 });

inspectionRequestSchema.index({ property_id: 1, createdAt: -1 });
inspectionRequestSchema.index({ status: 1 });
inspectionRequestSchema.index({ submission_id: 1 });

propertyManagementSchema.index({ email: 1, createdAt: -1 });
propertyManagementSchema.index({ status: 1 });
propertyManagementSchema.index({ submission_id: 1 });

rnplWaitlistSchema.index({ email: 1, createdAt: -1 });
rnplWaitlistSchema.index({ status: 1 });
rnplWaitlistSchema.index({ submission_id: 1 });

// Export models
module.exports = {
  HomeService: mongoose.model("HomeService", homeServiceSchema),
  ArtisanApplication: mongoose.model(
    "ArtisanApplication",
    artisanApplicationSchema
  ),
  ContactForm: mongoose.model("ContactForm", contactFormSchema),
  DisputeResolution: mongoose.model(
    "DisputeResolution",
    disputeResolutionSchema
  ),
  InspectionRequest: mongoose.model(
    "InspectionRequest",
    inspectionRequestSchema
  ),
  PropertyManagement: mongoose.model(
    "PropertyManagement",
    propertyManagementSchema
  ),
  RNPLWaitlist: mongoose.model("RNPLWaitlist", rnplWaitlistSchema),
};
