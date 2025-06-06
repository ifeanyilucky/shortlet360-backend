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
    const { name, email, phone, service, customService, description, address } =
      req.body;

    // Validate required fields
    if (!name || !email || !phone || !service || !description) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Validate address fields
    if (
      !address ||
      !address.street ||
      !address.state ||
      !address.localGovernment ||
      !address.area
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Please provide complete address information",
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
          customService,
          description,
          address,
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
      text: `New home service request from ${name}. Service: ${service}${
        customService ? ` (Custom: ${customService})` : ""
      }. Contact: ${email}, ${phone}. Address: ${address.street}, ${
        address.area
      }, ${address.localGovernment}, ${
        address.state
      }. Description: ${description}`,
      html: emailHtml,
    });

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: "Your Home Service Request - Aplet360",
      text: `Dear ${name}, thank you for your home service request. We have received your request for ${service}${
        customService ? ` (${customService})` : ""
      } and will get back to you shortly.`,
      html: `<p>Dear ${name},</p>
             <p>Thank you for your home service request. We have received your request for <strong>${service}${
        customService ? ` (${customService})` : ""
      }</strong> and will get back to you shortly.</p>
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

    // Validate address fields
    if (
      !address ||
      !address.street ||
      !address.state ||
      !address.localGovernment ||
      !address.area
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Please provide complete address information",
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
      text: `New artisan application from ${fullName}. Skill: ${skillCategory}. Experience: ${experience}. Contact: ${email}, ${phone}. Address: ${address.street}, ${address.area}, ${address.localGovernment}, ${address.state}.`,
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

// Submit dispute resolution form
const submitDisputeResolutionForm = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      actionType,
      disputeType,
      bookingReference,
      propertyName,
      otherPartyId,
      description,
      urgencyLevel,
      userRole,
      paymentReference,
      paymentStatus,
      amount,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !email ||
      !phone ||
      !actionType ||
      !disputeType ||
      !description
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Validate action type
    if (!["report", "dispute"].includes(actionType)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid action type",
      });
    }

    // For disputes, otherPartyId and payment are required
    if (actionType === "dispute") {
      if (!otherPartyId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Other party ID is required for disputes",
        });
      }

      if (!paymentReference || paymentStatus !== "paid") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Payment is required for dispute resolution",
        });
      }
    }

    // Render email template
    const emailHtml = await new Promise((resolve, reject) => {
      ejs.renderFile(
        path.join(__dirname, "../views/emails/disputeResolution.ejs"),
        {
          name,
          email,
          phone,
          actionType,
          disputeType,
          bookingReference: bookingReference || "Not provided",
          propertyName: propertyName || "Not provided",
          otherPartyId: otherPartyId || "Not provided",
          description,
          urgencyLevel,
          userRole: userRole || "User",
          date: new Date().toLocaleDateString(),
          isDispute: actionType === "dispute",
          paymentReference: paymentReference || "Not applicable",
          paymentStatus: paymentStatus || "Not applicable",
          amount: amount || 0,
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

    // Determine email recipient based on action type
    const recipient =
      actionType === "dispute" ? "legal@aplet360.com" : "support@aplet360.com";
    const subjectPrefix = actionType === "dispute" ? "DISPUTE" : "REPORT";
    const actionLabel = actionType === "dispute" ? "Dispute" : "Report";

    // Send email notification
    await sendEmail({
      to: "support@aplet360.com",
      subject: `${subjectPrefix}: ${disputeType} - ${urgencyLevel.toUpperCase()} Priority`,
      text: `New ${actionLabel.toLowerCase()} from ${name}. Type: ${disputeType}. Contact: ${email}, ${phone}. Other Party ID: ${
        otherPartyId || "Not provided"
      }. Description: ${description}`,
      html: emailHtml,
    });

    // Send confirmation email to user
    const confirmationMessage =
      actionType === "dispute"
        ? "Your dispute has been submitted to our legal team and will be reviewed within 24-48 hours."
        : "Your report has been submitted to our support team and will be reviewed within 24 hours.";

    await sendEmail({
      to: email,
      subject: `${actionLabel} Received - Aplet360`,
      text: `Dear ${name}, thank you for submitting your ${actionLabel.toLowerCase()}. ${confirmationMessage}`,
      html: `<p>Dear ${name},</p>
             <p>Thank you for submitting your ${actionLabel.toLowerCase()} regarding <strong>${disputeType}</strong>.</p>
             <p>${confirmationMessage}</p>
             <p>Reference: ${bookingReference || "N/A"}</p>
             <p>Best regards,<br>Aplet360 ${
               actionType === "dispute" ? "Legal" : "Support"
             } Team</p>`,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: `${actionLabel} submitted successfully`,
      actionType,
    });
  } catch (error) {
    console.error("Error submitting dispute resolution form:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to submit request",
      error: error.message,
    });
  }
};

// Submit inspection request form
const submitInspectionRequest = async (req, res) => {
  try {
    const {
      fullName,
      phoneNumber,
      propertyId,
      preferredDate1,
      preferredDate2,
      preferredDate3,
    } = req.body;

    // Validate required fields
    if (
      !fullName ||
      !phoneNumber ||
      !propertyId ||
      !preferredDate1 ||
      !preferredDate2 ||
      !preferredDate3
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Render email template
    const emailHtml = await new Promise((resolve, reject) => {
      ejs.renderFile(
        path.join(__dirname, "../views/emails/inspectionRequest.ejs"),
        {
          fullName,
          phoneNumber,
          propertyId,
          preferredDate1,
          preferredDate2,
          preferredDate3,
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
      subject: `New Property Inspection Request - ${propertyId}`,
      text: `New property inspection request from ${fullName}. Property ID: ${propertyId}. Contact: ${phoneNumber}. Preferred dates: ${preferredDate1}, ${preferredDate2}, ${preferredDate3}`,
      html: emailHtml,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Inspection request submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting inspection request:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to submit inspection request",
      error: error.message,
    });
  }
};

module.exports = {
  submitHomeServiceForm,
  submitBecomeArtisanForm,
  submitContactForm,
  submitDisputeResolutionForm,
  submitInspectionRequest,
};
