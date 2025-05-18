const nodemailer = require("nodemailer");

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.SMTP_USER || "support@aplet360.com",
    pass: process.env.SMTP_PASS || "Xna!c9fa",
  },
});

// // Verify transporter connection configuration
// transporter.verify(function (error, success) {
//   if (error) {
//     console.log("Error verifying mail server:", error);
//   } else {
//     console.log("Mail server is ready to send messages");
//   }
// });

/**
 * Send email using the configured transporter
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text version of email
 * @param {string} options.html - HTML version of email
 * @returns {Promise} - Resolves with info about sent email
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Aplet360 Support" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

// Example function for sending password reset emails
const sendPasswordResetEmail = async (userEmail, resetToken) => {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;

  return sendEmail({
    to: userEmail,
    subject: "Password Reset Request",
    text: `Please reset your password by clicking the following link: ${resetUrl}`,
    html: `
            <p>You requested a password reset.</p>
            <p>Please click the following link to reset your password:</p>
            <a href="${resetUrl}">Reset Password</a>
        `,
  });
};

// Add this new function
const sendNewPostNotification = async (subscriber, creator, postTitle) => {
  return sendEmail({
    to: subscriber.email,
    subject: `New Post from ${creator.displayName || creator.username}`,
    text: `${
      creator.displayName || creator.username
    } has published a new post: ${postTitle}`,
    html: `
      <h3>${
        creator.displayName || creator.username
      } has published a new post</h3>
      <p>Title: ${postTitle}</p>
      <a href="${process.env.APP_URL}/posts/${postId}">View Post</a>
    `,
  });
};

/**
 * Send welcome email to newly registered users
 * @param {Object} user - User object containing email, first_name, role, and short_id
 * @returns {Promise} - Resolves with info about sent email
 */
const sendWelcomeEmail = async (user) => {
  const paymentUrl = `${process.env.FRONTEND_URL}/registration-payment`;

  try {
    // Use EJS to render the welcome email template
    const ejs = require("ejs");
    const path = require("path");

    const data = await new Promise((resolve, reject) => {
      ejs.renderFile(
        path.join(__dirname, "../views/emails/welcomeEmail.ejs"),
        {
          name: user.first_name,
          short_id: user.short_id,
          role: user.role,
          paymentUrl,
        },
        (err, result) => {
          if (err) {
            console.error("Error rendering welcome email template:", err);
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });

    return sendEmail({
      to: user.email,
      subject: "Welcome to Aplet360",
      text: `Welcome to Aplet360, ${user.first_name}! Your account has been created successfully with ID: ${user.short_id}. To complete your registration and activate your account, please proceed with the registration payment at ${paymentUrl}`,
      html: data,
    });
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw error;
  }
};

/**
 * Send notification email when a new property is added
 * @param {Object} property - Property object
 * @param {Object} owner - Owner user object
 * @returns {Promise} - Resolves with info about sent email
 */
const sendNewPropertyNotification = async (property, owner) => {
  try {
    // Use EJS to render the email template
    const ejs = require("ejs");
    const path = require("path");

    const adminUrl = `${process.env.FRONTEND_URL}/admin/properties/${property._id}`;

    const data = await new Promise((resolve, reject) => {
      ejs.renderFile(
        path.join(__dirname, "../views/emails/newPropertyNotification.ejs"),
        {
          property,
          owner,
          date: new Date().toLocaleDateString(),
          adminUrl,
        },
        (err, result) => {
          if (err) {
            console.error(
              "Error rendering property notification template:",
              err
            );
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });

    return sendEmail({
      to: "support@aplet360.com",
      subject: `New Property Listing: ${property.property_name}`,
      text: `A new property has been listed on Aplet360. Property: ${property.property_name} (ID: ${property.short_id}). Owner: ${owner.first_name} ${owner.last_name} (ID: ${owner.short_id}). This property requires admin review before it can be published.`,
      html: data,
    });
  } catch (error) {
    console.error("Error sending property notification email:", error);
    throw error;
  }
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendNewPostNotification,
  sendWelcomeEmail,
  sendNewPropertyNotification,
};
