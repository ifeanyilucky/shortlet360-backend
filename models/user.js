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
    // Discount code usage tracking
    discount_codes_used: [
      {
        code: String,
        discount_amount: Number,
        original_amount: Number,
        final_amount: Number,
        used_at: {
          type: Date,
          default: Date.now,
        },
        applicable_to: String, // 'registration_fee', 'booking', etc.
      },
    ],
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
    // KYC Verification Fields - Updated Architecture
    kyc: {
      // Tier 1: Phone and NIN Verification (Automated via YouVerify)
      tier1: {
        status: {
          type: String,
          enum: ["pending", "verified", "rejected", "not_started"],
          default: "not_started",
        },
        phone_verified: { type: Boolean, default: false },
        nin_verified: { type: Boolean, default: false },
        nin: String,
        // Store YouVerify phone verification response
        phone_verification_data: {
          verification_id: String,
          status: String,
          phone_details: Array,
          verification_response: Object, // Full YouVerify response
          verified_at: Date,
        },
        // Store YouVerify NIN verification response
        nin_verification_data: {
          verification_id: String,
          status: String,
          first_name: String,
          middle_name: String,
          last_name: String,
          date_of_birth: String,
          gender: String,
          address: Object,
          mobile: String,
          birth_state: String,
          birth_lga: String,
          birth_country: String,
          religion: String,
          image: String, // Base64 image from YouVerify
          verification_response: Object, // Full YouVerify response
          verified_at: Date,
        },
        completed_at: Date,
      },
      // Tier 2: Utility Bill Verification (Manual Admin Approval)
      tier2: {
        status: {
          type: String,
          enum: ["pending", "verified", "rejected", "not_started"],
          default: "not_started",
        },
        utility_bill: {
          document: Object, // Store uploaded utility bill document info
          document_type: {
            type: String,
            enum: [
              "electricity",
              "water",
              "gas",
              "internet",
              "cable_tv",
              "phone",
            ],
          },
          uploaded_at: Date,
          verification_status: {
            type: String,
            enum: ["pending", "verified", "rejected", "not_submitted"],
            default: "not_submitted",
          },
          admin_notes: String, // Admin can add notes during review
          reviewed_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          reviewed_at: Date,
        },
        completed_at: Date,
      },
      // Tier 3: Bank Statement, BVN, and Business Verification (Automated via YouVerify)
      tier3: {
        status: {
          type: String,
          enum: ["pending", "verified", "rejected", "not_started"],
          default: "not_started",
        },
        // Bank Account Verification
        bank_account: {
          account_number: String,
          bank_code: String,
          bank_name: String,
          account_name: String,
          verification_status: {
            type: String,
            enum: ["pending", "verified", "rejected", "not_submitted"],
            default: "not_submitted",
          },
          verification_data: {
            verification_id: String,
            status: String,
            verification_response: Object, // Full YouVerify response
            verified_at: Date,
          },
        },
        // BVN Verification
        bvn: {
          bvn_number: String,
          verification_status: {
            type: String,
            enum: ["pending", "verified", "rejected", "not_submitted"],
            default: "not_submitted",
          },
          verification_data: {
            verification_id: String,
            status: String,
            first_name: String,
            middle_name: String,
            last_name: String,
            date_of_birth: String,
            phone_number: String,
            registration_date: String,
            enrollment_bank: String,
            enrollment_branch: String,
            image: String, // Base64 image from YouVerify
            verification_response: Object, // Full YouVerify response
            verified_at: Date,
          },
        },
        // Business/Workplace Verification
        business: {
          business_name: String,
          business_type: {
            type: String,
            enum: ["company", "business", "workplace"],
          },
          rc_number: String, // Registration certificate number
          verification_status: {
            type: String,
            enum: ["pending", "verified", "rejected", "not_submitted"],
            default: "not_submitted",
          },
          verification_data: {
            verification_id: String,
            status: String,
            company_name: String,
            registration_number: String,
            company_type: String,
            registration_date: String,
            company_status: String,
            address: Object,
            directors: Array,
            verification_response: Object, // Full YouVerify response
            verified_at: Date,
          },
        },
        completed_at: Date,
      },
    },
    // Referral System Fields
    referral: {
      referral_code: {
        type: String,
        unique: true,
        sparse: true, // Allows multiple null values
      },
      referred_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      referral_stats: {
        total_referrals: { type: Number, default: 0 },
        verified_referrals: { type: Number, default: 0 },
        pending_referrals: { type: Number, default: 0 },
        earned_rewards: { type: Number, default: 0 },
        available_rewards: { type: Number, default: 0 },
        last_reward_earned: Date,
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
