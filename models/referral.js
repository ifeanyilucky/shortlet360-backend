const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referred_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referral_code: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rewarded"],
      default: "pending",
    },
    referred_user_role: {
      type: String,
      enum: ["user", "owner"],
      required: true,
    },
    verification_completed_at: {
      type: Date,
      default: null,
    },
    reward_earned: {
      type: Number,
      default: 0,
    },
    reward_type: {
      type: String,
      enum: ["home_fix_service", "cash", "credit"],
      default: "home_fix_service",
    },
    reward_claimed: {
      type: Boolean,
      default: false,
    },
    reward_claimed_at: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    // Track email invitations
    invitation_sent: {
      type: Boolean,
      default: false,
    },
    invitation_email: {
      type: String,
      default: null,
    },
    invitation_sent_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
referralSchema.index({ referrer: 1 });
referralSchema.index({ referred_user: 1 });
referralSchema.index({ referral_code: 1 });
referralSchema.index({ status: 1 });
referralSchema.index({ createdAt: -1 });

// Compound indexes
referralSchema.index({ referrer: 1, status: 1 });
referralSchema.index({ referrer: 1, createdAt: -1 });

// Virtual for calculating reward amount based on referred user role
referralSchema.virtual("calculated_reward").get(function () {
  if (this.status !== "verified") return 0;
  
  // Reward calculation logic
  if (this.referred_user_role === "owner") {
    // 1 free service for every 5 owners
    return 1; // This would be calculated based on total referrals
  } else if (this.referred_user_role === "user") {
    // 1 free service for every 20 users
    return 1; // This would be calculated based on total referrals
  }
  
  return 0;
});

// Static method to calculate rewards for a referrer
referralSchema.statics.calculateRewards = async function (referrerId) {
  const ownerReferrals = await this.countDocuments({
    referrer: referrerId,
    referred_user_role: "owner",
    status: "verified",
  });
  
  const userReferrals = await this.countDocuments({
    referrer: referrerId,
    referred_user_role: "user",
    status: "verified",
  });
  
  const ownerRewards = Math.floor(ownerReferrals / 5);
  const userRewards = Math.floor(userReferrals / 20);
  
  return {
    ownerReferrals,
    userReferrals,
    ownerRewards,
    userRewards,
    totalRewards: ownerRewards + userRewards,
  };
};

// Instance method to mark referral as verified
referralSchema.methods.markAsVerified = async function () {
  this.status = "verified";
  this.verification_completed_at = new Date();
  await this.save();
  
  // Update referrer's stats
  const User = mongoose.model("User");
  await User.findByIdAndUpdate(this.referrer, {
    $inc: {
      "referral.referral_stats.verified_referrals": 1,
      "referral.referral_stats.pending_referrals": -1,
    },
  });
};

const Referral = mongoose.model("Referral", referralSchema);

module.exports = Referral;
