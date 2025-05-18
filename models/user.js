const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone_number: String,
    photo: {
      type: Object,
      default: null,
    },
    business_name: String,
    role: {
      type: String,
      enum: ["user", "owner", "admin"],
      default: "user",
    },
    is_verified: { type: Boolean, default: false },
    is_active: { type: Boolean, default: false },
    registration_payment_status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    registration_payment: {
      type: Object,
      default: null,
    },
    host_details: {
      id_document: String,
      verification_status: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
      },
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
      },
    ],
    short_id: {
      type: String,
      unique: true,
      required: true,
    },
    // Email verification fields
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    // Phone verification fields
    phoneVerificationCode: String,
    phoneVerificationExpire: Date,
    // Password reset fields
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    // KYC Verification Fields
    kyc: {
      // Tier 1: Phone and Email Verification
      tier1: {
        status: {
          type: String,
          enum: ["pending", "verified", "rejected"],
          default: "pending",
        },
        email_verified: { type: Boolean, default: false },
        phone_verified: { type: Boolean, default: false },
        completed_at: Date,
      },
      // Tier 2: Address and Identity Verification
      tier2: {
        status: {
          type: String,
          enum: ["pending", "verified", "rejected", "not_started"],
          default: "not_started",
        },
        address: {
          street: String,
          city: String,
          state: String,
          postal_code: String,
          country: String,
          verification_status: {
            type: String,
            enum: ["pending", "verified", "rejected", "not_submitted"],
            default: "not_submitted",
          },
        },
        identity: {
          nin: String,
          nin_verification_id: String, // ID from Prembly verification
          verification_status: {
            type: String,
            enum: ["pending", "verified", "rejected", "not_submitted"],
            default: "not_submitted",
          },
          verification_data: Object, // Store verification response
        },
        completed_at: Date,
      },
      // Tier 3: Work/Business and Bank Statement Verification (For monthly rent users)
      tier3: {
        status: {
          type: String,
          enum: ["pending", "verified", "rejected", "not_started"],
          default: "not_started",
        },
        employment: {
          employer_name: String,
          position: String,
          employment_status: String, // full-time, part-time, self-employed, etc.
          work_address: String,
          work_phone: String,
          verification_status: {
            type: String,
            enum: ["pending", "verified", "rejected", "not_submitted"],
            default: "not_submitted",
          },
        },
        bank_statement: {
          bank_name: String,
          account_number: String, // Last 4 digits only for security
          statement_document: Object, // Store document info
          verification_status: {
            type: String,
            enum: ["pending", "verified", "rejected", "not_submitted"],
            default: "not_submitted",
          },
        },
        completed_at: Date,
      },
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.createJWT = function () {
  return jwt.sign(
    { userId: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_LIFETIME }
  );
};

userSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
