const Newsletter = require("../models/newsletter");
const User = require("../models/user");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");
const { sendEmail } = require("../utils/sendEmails");
const ejs = require("ejs");
const path = require("path");
const { createGeneralNewsletter } = require("../utils/newsletterTemplates");

// Subscribe to newsletter
const subscribeToNewsletter = async (req, res) => {
  const { email, source = "landing_page" } = req.body;

  if (!email) {
    throw new BadRequestError("Email is required");
  }

  // Check if email already exists
  const existingSubscription = await Newsletter.findOne({
    email: email.toLowerCase(),
  });

  if (existingSubscription) {
    if (existingSubscription.status === "active") {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "You are already subscribed to our newsletter",
      });
    } else {
      // Reactivate subscription
      existingSubscription.status = "active";
      existingSubscription.unsubscribed_at = null;
      existingSubscription.source = source;
      await existingSubscription.save();

      return res.status(StatusCodes.OK).json({
        success: true,
        message:
          "Welcome back! Your newsletter subscription has been reactivated",
      });
    }
  }

  // Check if email belongs to a registered user
  const user = await User.findOne({ email: email.toLowerCase() });

  // Create new subscription
  const subscription = await Newsletter.create({
    email: email.toLowerCase(),
    source,
    user: user ? user._id : null,
  });

  // Send welcome email
  try {
    const emailTemplate = await ejs.renderFile(
      path.join(__dirname, "../views/emails/newsletter-welcome.ejs"),
      {
        email: subscription.email,
        unsubscribeUrl: `${process.env.FRONTEND_URL}/newsletter/unsubscribe?token=${subscription._id}`,
      }
    );

    await sendEmail({
      to: subscription.email,
      subject: "Welcome to Aplet360 Newsletter!",
      html: emailTemplate,
    });
  } catch (emailError) {
    console.error("Error sending welcome email:", emailError);
    // Don't fail the subscription if email fails
  }

  // Log subscription for analytics (optional)
  console.log(
    `New newsletter subscription: ${subscription.email} from ${source}`
  );

  res.status(StatusCodes.CREATED).json({
    success: true,
    message:
      "Successfully subscribed to newsletter! Check your email for confirmation.",
    data: {
      email: subscription.email,
      subscribed_at: subscription.subscribed_at,
      source: subscription.source,
    },
  });
};

// Unsubscribe from newsletter
const unsubscribeFromNewsletter = async (req, res) => {
  const { token, email } = req.query;

  let subscription;

  if (token) {
    subscription = await Newsletter.findById(token);
  } else if (email) {
    subscription = await Newsletter.findOne({ email: email.toLowerCase() });
  } else {
    throw new BadRequestError("Token or email is required");
  }

  if (!subscription) {
    throw new NotFoundError("Subscription not found");
  }

  if (subscription.status === "unsubscribed") {
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "You are already unsubscribed from our newsletter",
    });
  }

  subscription.status = "unsubscribed";
  subscription.unsubscribed_at = new Date();
  await subscription.save();

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Successfully unsubscribed from newsletter",
  });
};

// Get all newsletter subscribers (Admin only)
const getAllSubscribers = async (req, res) => {
  const { page = 1, limit = 10, status, source, search } = req.query;

  const filter = {};

  // Filter by status
  if (status && status !== "") {
    filter.status = status;
  }

  // Filter by source
  if (source && source !== "") {
    filter.source = source;
  }

  // Search filter
  if (search && search.trim() !== "") {
    filter.email = { $regex: search.trim(), $options: "i" };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const total = await Newsletter.countDocuments(filter);
  const subscribers = await Newsletter.find(filter)
    .populate("user", "first_name last_name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(StatusCodes.OK).json({
    success: true,
    data: subscribers,
    pagination: {
      current_page: parseInt(page),
      total_pages: Math.ceil(total / parseInt(limit)),
      total_items: total,
      items_per_page: parseInt(limit),
    },
  });
};

// Get newsletter statistics (Admin only)
const getNewsletterStats = async (req, res) => {
  const totalSubscribers = await Newsletter.countDocuments({
    status: "active",
  });
  const totalUnsubscribed = await Newsletter.countDocuments({
    status: "unsubscribed",
  });

  // Get subscribers by source
  const subscribersBySource = await Newsletter.aggregate([
    { $match: { status: "active" } },
    { $group: { _id: "$source", count: { $sum: 1 } } },
  ]);

  // Get recent subscribers (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentSubscribers = await Newsletter.countDocuments({
    status: "active",
    subscribed_at: { $gte: thirtyDaysAgo },
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      total_active_subscribers: totalSubscribers,
      total_unsubscribed: totalUnsubscribed,
      recent_subscribers: recentSubscribers,
      subscribers_by_source: subscribersBySource,
    },
  });
};

// Send newsletter to all active subscribers (Admin only)
const sendNewsletter = async (req, res) => {
  const { subject, content, html_content, use_template = true } = req.body;

  if (!subject || (!content && !html_content)) {
    throw new BadRequestError("Subject and content are required");
  }

  // Get all active subscribers
  const subscribers = await Newsletter.find({ status: "active" });

  if (subscribers.length === 0) {
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "No active subscribers found",
    });
  }

  // Send emails in batches to avoid overwhelming the email service
  const batchSize = 50;
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    const emailPromises = batch.map(async (subscriber) => {
      try {
        const unsubscribeUrl = `${process.env.FRONTEND_URL}/newsletter/unsubscribe?token=${subscriber._id}`;

        let emailContent;
        if (use_template) {
          // Use the newsletter template
          emailContent = createGeneralNewsletter(
            subject,
            html_content || content
          );
        } else {
          // Use raw content
          emailContent = html_content || content;
        }

        // Add unsubscribe link to email content
        emailContent += `<br><br><div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280; margin: 0;">
            <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe from this newsletter</a>
          </p>
        </div>`;

        await sendEmail({
          to: subscriber.email,
          subject,
          html: emailContent,
        });

        successCount++;
      } catch (error) {
        console.error(`Failed to send email to ${subscriber.email}:`, error);
        failureCount++;
      }
    });

    await Promise.all(emailPromises);

    // Add delay between batches
    if (i + batchSize < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: `Newsletter sent successfully. ${successCount} emails sent, ${failureCount} failed.`,
    data: {
      total_subscribers: subscribers.length,
      successful_sends: successCount,
      failed_sends: failureCount,
    },
  });
};

// Export subscribers as CSV (Admin only)
const exportSubscribers = async (req, res) => {
  const { status, source } = req.query;

  const filter = {};

  // Filter by status
  if (status && status !== "") {
    filter.status = status;
  }

  // Filter by source
  if (source && source !== "") {
    filter.source = source;
  }

  const subscribers = await Newsletter.find(filter)
    .populate("user", "first_name last_name")
    .sort({ createdAt: -1 });

  // Generate CSV content
  const csvHeader = "Email,Status,Source,Subscribed Date,User Name\n";
  const csvRows = subscribers
    .map((subscriber) => {
      const userName = subscriber.user
        ? `${subscriber.user.first_name} ${subscriber.user.last_name}`
        : "Guest";

      return [
        subscriber.email,
        subscriber.status,
        subscriber.source,
        new Date(subscriber.subscribed_at).toISOString().split("T")[0],
        userName,
      ].join(",");
    })
    .join("\n");

  const csvContent = csvHeader + csvRows;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="newsletter-subscribers-${
      new Date().toISOString().split("T")[0]
    }.csv"`
  );
  res.status(StatusCodes.OK).send(csvContent);
};

module.exports = {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getAllSubscribers,
  getNewsletterStats,
  sendNewsletter,
  exportSubscribers,
};
