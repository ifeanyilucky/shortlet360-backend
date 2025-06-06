const mongoose = require("mongoose");
const User = require("../models/user");
require("dotenv").config();

/**
 * Migration script to add referral codes to existing users
 * This should be run once after implementing the referral system
 */
async function migrateReferralCodes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Find all users without referral codes
    const usersWithoutReferralCodes = await User.find({
      $or: [
        { "referral.referral_code": { $exists: false } },
        { "referral.referral_code": null },
        { referral: { $exists: false } },
      ],
    });

    console.log(
      `Found ${usersWithoutReferralCodes.length} users without referral codes`
    );

    let updatedCount = 0;

    for (const user of usersWithoutReferralCodes) {
      try {
        // Generate referral code for the user
        const currentYear = new Date().getFullYear();
        const referralCode = `APLET-${user.short_id}-${currentYear}`;

        // Initialize referral object if it doesn't exist
        if (!user.referral) {
          user.referral = {};
        }

        // Set referral code and initialize stats
        user.referral.referral_code = referralCode;

        if (!user.referral.referral_stats) {
          user.referral.referral_stats = {
            total_referrals: 0,
            verified_referrals: 0,
            pending_referrals: 0,
            earned_rewards: 0,
            available_rewards: 0,
          };
        }

        await user.save();
        updatedCount++;

        if (updatedCount % 100 === 0) {
          console.log(`Updated ${updatedCount} users...`);
        }
      } catch (error) {
        console.error(`Error updating user ${user._id}:`, error.message);
      }
    }

    console.log(
      `Migration completed. Updated ${updatedCount} users with referral codes.`
    );

    // Verify the migration
    const totalUsersWithReferralCodes = await User.countDocuments({
      "referral.referral_code": { $exists: true, $ne: null },
    });

    console.log(
      `Total users with referral codes: ${totalUsersWithReferralCodes}`
    );
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateReferralCodes()
    .then(() => {
      console.log("Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}

module.exports = migrateReferralCodes;
