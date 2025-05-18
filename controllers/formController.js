const { StatusCodes } = require("http-status-codes");
const { sendEmail } = require("../utils/sendEmails");
const ejs = require("ejs");
const path = require("path");

/**
 * Submit Home Service form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const submitHomeServiceForm = async (req, res) => {
  try {
    const { name, email, phone, service, description } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !service || !description) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Render email template
    const emailHtml = await new Promise((resolve, reject) => {
      ejs.renderFile(
        path.join(__dirname, "../views/emails/homeServiceRequest.ejs"),
        {
          name,
          email,
          phone,
          service,
          description,
          date: new Date().toLocaleDateString(),
        },
        (err, result) => {
          if (err) {
            console.error("Error rendering email template:", err);
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });

    // Send email notification
    await sendEmail({
      to: "support@aplet360.com",
      subject: `New Home Service Request: ${service}`,
      text: `New home service request from ${name}. Service: ${service}. Contact: ${email}, ${phone}. Description: ${description}`,
      html: emailHtml,
    });

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: "Your Home Service Request - Aplet360",
      text: `Dear ${name}, thank you for your home service request. We have received your request for ${service} and will get back to you shortly.`,
      html: `<p>Dear ${name},</p>
             <p>Thank you for your home service request. We have received your request for <strong>${service}</strong> and will get back to you shortly.</p>
             <p>Best regards,<br>Aplet360 Team</p>`,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Home service request submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting home service form:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to submit home service request",
      error: error.message,
    });
  }
};

/**
 * Submit Become Artisan form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const submitBecomeArtisanForm = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      address,
      skillCategory,
      experience,
      idType,
      idNumber,
      about,
    } = req.body;

    // Validate required fields
    if (
      !fullName ||
      !email ||
      !phone ||
      !address ||
      !skillCategory ||
      !experience ||
      !idType ||
      !idNumber ||
      !about
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Render email template
    const emailHtml = await new Promise((resolve, reject) => {
      ejs.renderFile(
        path.join(__dirname, "../views/emails/artisanApplication.ejs"),
        {
          fullName,
          email,
          phone,
          address,
          skillCategory,
          experience,
          idType,
          idNumber,
          about,
          date: new Date().toLocaleDateString(),
        },
        (err, result) => {
          if (err) {
            console.error("Error rendering email template:", err);
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });

    // Send email notification
    await sendEmail({
      to: "support@aplet360.com",
      subject: `New Artisan Application: ${skillCategory}`,
      text: `New artisan application from ${fullName}. Skill: ${skillCategory}. Experience: ${experience}. Contact: ${email}, ${phone}.`,
      html: emailHtml,
    });

    // Send confirmation email to applicant
    await sendEmail({
      to: email,
      subject: "Your Artisan Application - Aplet360",
      text: `Dear ${fullName}, thank you for your application to join our artisan network. We have received your application and will review it shortly.`,
      html: `<p>Dear ${fullName},</p>
             <p>Thank you for your application to join our artisan network. We have received your application and will review it shortly.</p>
             <p>Best regards,<br>Aplet360 Team</p>`,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Artisan application submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting artisan application:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to submit artisan application",
      error: error.message,
    });
  }
};

/**
 * Submit Contact form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Render email template
    const emailHtml = await new Promise((resolve, reject) => {
      ejs.renderFile(
        path.join(__dirname, "../views/emails/contactFormMessage.ejs"),
        {
          name,
          email,
          phone,
          subject,
          message,
          date: new Date().toLocaleDateString(),
        },
        (err, result) => {
          if (err) {
            console.error("Error rendering email template:", err);
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });

    // Send email notification
    await sendEmail({
      to: "support@aplet360.com",
      subject: `New Contact Form Message: ${subject}`,
      text: `New contact form message from ${name}. Subject: ${subject}. Contact: ${email}, ${
        phone || "Not provided"
      }. Message: ${message}`,
      html: emailHtml,
    });

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: "Your Message Received - Aplet360",
      text: `Dear ${name}, thank you for contacting us. We have received your message and will get back to you shortly.`,
      html: `<p>Dear ${name},</p>
             <p>Thank you for contacting Aplet360. We have received your message regarding <strong>${subject}</strong> and will get back to you shortly.</p>
             <p>Best regards,<br>Aplet360 Team</p>`,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Error submitting contact form:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
};

module.exports = {
  submitHomeServiceForm,
  submitBecomeArtisanForm,
  submitContactForm,
};
