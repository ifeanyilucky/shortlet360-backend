const nodemailer = require("nodemailer");

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
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
      from: `"Your App Name" <${process.env.SMTP_USER}>`,
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

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendNewPostNotification,
};
