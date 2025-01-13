const cron = require("node-cron");
const { handleExpiredSubscriptions } = require("../controllers/subscription");
const logger = require("../utils/logger"); // Optional: Create this for logging

// Run every day at midnight (00:00)
const scheduleSubscriptionCheck = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("Running subscription expiration check...");
      await handleExpiredSubscriptions();
      console.log("Subscription check completed successfully");
    } catch (error) {
      console.error("Error in subscription check cron job:", error);
    }
  });
};

// Run every hour to catch any missed expirations
const scheduleHourlySubscriptionCheck = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      console.log("Running hourly subscription check...");
      await handleExpiredSubscriptions();
      console.log("Hourly subscription check completed");
    } catch (error) {
      console.error("Error in hourly subscription check:", error);
    }
  });
};

const initCronJobs = () => {
  scheduleSubscriptionCheck();
  scheduleHourlySubscriptionCheck();
  console.log("Cron jobs initialized");
};

module.exports = {
  initCronJobs,
};
