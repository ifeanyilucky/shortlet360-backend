const cron = require("node-cron");
const Subscription = require("../models/subscription");
const Wallet = require("../models/wallet");
const { sendEmail } = require("../utils/sendEmails");

// Run every day at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    // Find subscriptions that are about to expire (within 24 hours)
    const subscriptions = await Subscription.find({
      status: "active",
      endDate: {
        $lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      autoRenew: true,
    }).populate("subscriber creator");

    for (const subscription of subscriptions) {
      if (subscription.paymentMethod === "wallet") {
        const wallet = await Wallet.findOne({ user: subscription.subscriber });

        if (wallet.balance >= subscription.plan.amount) {
          // Process renewal
          wallet.balance -= subscription.plan.amount;
          await wallet.save();

          // Update subscription dates
          subscription.startDate = subscription.endDate;
          subscription.endDate = new Date(
            subscription.endDate.setMonth(
              subscription.endDate.getMonth() + subscription.plan.noOfMonths
            )
          );
          subscription.lastRenewalDate = new Date();
          subscription.nextRenewalDate = subscription.endDate;

          subscription.transactionHistory.push({
            transactionId: Date.now().toString(),
            amount: subscription.plan.amount,
            date: new Date(),
            status: "success",
            paymentMethod: "wallet",
          });

          await subscription.save();

          // Send renewal confirmation
          await sendEmail({
            email: subscription.subscriber.email,
            subject: "Subscription Renewed",
            message: `Your subscription to ${subscription.creator.username}'s content has been renewed`,
          });
        } else {
          // Handle insufficient funds
          subscription.status = "expired";
          await subscription.save();

          await sendEmail({
            email: subscription.subscriber.email,
            subject: "Subscription Expired - Insufficient Funds",
            message: `Your subscription to ${subscription.creator.username}'s content has expired due to insufficient funds`,
          });
        }
      } else {
        // Handle Paystack/Flutterwave renewal
        // Implement payment gateway renewal logic here
      }
    }

    // Handle expired subscriptions
    await Subscription.updateMany(
      {
        status: "active",
        endDate: { $lte: new Date() },
        autoRenew: false,
      },
      {
        $set: { status: "expired" },
      }
    );
  } catch (error) {
    console.error("Subscription cron job error:", error);
  }
});
