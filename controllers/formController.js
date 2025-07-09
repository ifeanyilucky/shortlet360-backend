const { StatusCodes } = require("http-status-codes");
const { sendEmail } = require("../utils/sendEmails");
const ejs = require("ejs");
const path = require("path");
const {
  HomeService,
  ArtisanApplication,
  ContactForm,
  DisputeResolution,
  InspectionRequest,
  PropertyManagement,
  RNPLWaitlist,
} = require("../models/formSubmission");
const Newsletter = require("../models/newsletter");

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

    // Generate unique submission ID
    const submissionId = `HS-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Save to database
    const homeServiceSubmission = new HomeService({
      submission_id: submissionId,
      name,
      email,
      phone,
      service,
      custom_service: customService,
      description,
      address: {
        street: address.street,
        area: address.area,
        local_government: address.localGovernment,
        state: address.state,
      },
    });

    await homeServiceSubmission.save();

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
      data: {
        submissionId,
        service,
        estimatedResponse: "24-48 hours",
      },
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

    // Generate unique submission ID
    const submissionId = `AA-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // Save to database
    const artisanApplication = new ArtisanApplication({
      submission_id: submissionId,
      full_name: fullName,
      email,
      phone,
      address: {
        street: address.street,
        area: address.area,
        local_government: address.localGovernment,
        state: address.state,
      },
      skill_category: skillCategory,
      experience,
      id_type: idType,
      id_number: idNumber,
      about,
    });

    await artisanApplication.save();

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
      data: {
        submissionId,
        skillCategory,
        estimatedResponse: "3-5 business days",
      },
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

    // Generate unique submission ID
    const submissionId = `CF-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // Save to database
    const contactFormSubmission = new ContactForm({
      submission_id: submissionId,
      name,
      email,
      phone,
      subject,
      message,
    });

    await contactFormSubmission.save();

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
      data: {
        submissionId,
        subject,
        estimatedResponse: "24 hours",
      },
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

    // Generate unique submission ID
    const submissionId = `${
      actionType === "dispute" ? "DR" : "RP"
    }-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Save to database
    const disputeSubmission = new DisputeResolution({
      submission_id: submissionId,
      name,
      email,
      phone,
      action_type: actionType,
      dispute_type: disputeType,
      booking_reference: bookingReference,
      property_name: propertyName,
      other_party_id: otherPartyId,
      description,
      urgency_level: urgencyLevel,
      user_role: userRole,
      payment_reference: paymentReference,
      payment_status: paymentStatus,
      amount,
      priority:
        urgencyLevel === "high"
          ? "high"
          : urgencyLevel === "medium"
          ? "medium"
          : "low",
    });

    await disputeSubmission.save();

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
      data: {
        submissionId,
        actionType,
        disputeType,
        urgencyLevel,
        estimatedResponse:
          urgencyLevel === "high"
            ? "4-6 hours"
            : urgencyLevel === "medium"
            ? "24 hours"
            : "48-72 hours",
      },
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
      owner_email,
    } = req.body;

    // Validate required fields
    if (
      !fullName ||
      !phoneNumber ||
      !propertyId ||
      !preferredDate1 ||
      !preferredDate2 ||
      !preferredDate3 ||
      !owner_email
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Generate unique submission ID
    const submissionId = `IR-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // Save to database
    const inspectionRequest = new InspectionRequest({
      submission_id: submissionId,
      full_name: fullName,
      phone_number: phoneNumber,
      property_id: propertyId,
      owner_email,
      preferred_dates: {
        date1: new Date(preferredDate1),
        date2: new Date(preferredDate2),
        date3: new Date(preferredDate3),
      },
    });

    await inspectionRequest.save();

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
          owner_email,
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

    // Send email notification to owner with support as CC
    await sendEmail({
      to: owner_email,
      cc: "support@aplet360.com",
      subject: `New Property Inspection Request - ${propertyId}`,
      text: `New property inspection request from ${fullName}. Property ID: ${propertyId}. Contact: ${phoneNumber}. Preferred dates: ${preferredDate1}, ${preferredDate2}, ${preferredDate3}`,
      html: emailHtml,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Inspection request submitted successfully",
      data: {
        submissionId,
        propertyId,
        preferredDates: [preferredDate1, preferredDate2, preferredDate3],
        estimatedResponse: "24 hours",
      },
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

/**
 * Submit Property Management form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const submitPropertyManagementForm = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phoneNumber,
      propertyType,
      numberOfProperties,
      address,
      agreeToFee,
    } = req.body;

    // Validate required fields
    if (
      !fullName ||
      !email ||
      !phoneNumber ||
      !propertyType ||
      !numberOfProperties ||
      !agreeToFee
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

    // Validate agreement to fee
    if (!agreeToFee) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "You must agree to the 5% management fee",
      });
    }

    // Validate number of properties
    if (numberOfProperties < 1) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Number of properties must be at least 1",
      });
    }

    // Generate unique submission ID
    const submissionId = `PM-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // Save to database
    const propertyManagementApplication = new PropertyManagement({
      submission_id: submissionId,
      full_name: fullName,
      email,
      phone_number: phoneNumber,
      property_type: propertyType,
      number_of_properties: numberOfProperties,
      address: {
        street: address.street,
        area: address.area,
        local_government: address.localGovernment,
        state: address.state,
      },
      agree_to_fee: agreeToFee,
    });

    await propertyManagementApplication.save();

    // Render email template
    const emailHtml = await new Promise((resolve, reject) => {
      ejs.renderFile(
        path.join(
          __dirname,
          "../views/emails/propertyManagementApplication.ejs"
        ),
        {
          fullName,
          email,
          phoneNumber,
          propertyType,
          numberOfProperties,
          address,
          agreeToFee,
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

    // Send email notification to property management team
    await sendEmail({
      to: "property-management@aplet360.com",
      cc: "support@aplet360.com",
      subject: `New Property Management Application: ${propertyType} - ${numberOfProperties} Properties`,
      text: `New property management application from ${fullName}. Property Type: ${propertyType}. Number of Properties: ${numberOfProperties}. Contact: ${email}, ${phoneNumber}. Address: ${
        address.street
      }, ${address.area}, ${address.localGovernment}, ${
        address.state
      }. Agreed to 5% fee: ${agreeToFee ? "Yes" : "No"}`,
      html: emailHtml,
    });

    // Send confirmation email to applicant
    await sendEmail({
      to: email,
      subject: "Property Management Application Received - Aplet360",
      text: `Dear ${fullName}, thank you for your property management application. We have received your application for ${numberOfProperties} ${propertyType.toLowerCase()}(s) and will contact you within 24-48 hours to discuss the next steps.`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
               <h2 style="color: #1f2937;">Property Management Application Received</h2>
               <p>Dear ${fullName},</p>
               <p>Thank you for your interest in Aplet360's property management services. We have successfully received your application with the following details:</p>
               <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                 <h3 style="color: #374151; margin-top: 0;">Application Summary</h3>
                 <p><strong>Property Type:</strong> ${propertyType}</p>
                 <p><strong>Number of Properties:</strong> ${numberOfProperties}</p>
                 <p><strong>Location:</strong> ${address.area}, ${address.localGovernment}, ${address.state}</p>
                 <p><strong>Management Fee Agreement:</strong> 5% of rental income</p>
               </div>
               <p>Our property management team will review your application and contact you within 24-48 hours to discuss:</p>
               <ul>
                 <li>Property assessment and valuation</li>
                 <li>Management agreement terms</li>
                 <li>Onboarding process</li>
                 <li>Marketing and tenant acquisition strategy</li>
               </ul>
               <p>If you have any immediate questions, please don't hesitate to contact us at property-management@aplet360.com or call our support line.</p>
               <p>Best regards,<br>Aplet360 Property Management Team</p>
             </div>`,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Property management application submitted successfully",
      data: {
        submissionId,
        propertyType,
        numberOfProperties,
        estimatedResponse: "24-48 hours",
      },
    });
  } catch (error) {
    console.error("Error submitting property management application:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to submit property management application",
      error: error.message,
    });
  }
};

/**
 * Submit RNPL Waitlist form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const submitRNPLWaitlistForm = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      occupation,
      address,
      jobType,
      monthlyIncome,
      currentRentAmount,
      preferredLocation,
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !occupation || !address || !jobType) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Generate unique submission ID
    const submissionId = `RNPL-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // Save to database
    const rnplWaitlistSubmission = new RNPLWaitlist({
      submission_id: submissionId,
      full_name: fullName,
      email,
      phone,
      occupation,
      address,
      job_type: jobType,
      monthly_income: monthlyIncome,
      current_rent_amount: currentRentAmount,
      preferred_location: preferredLocation,
    });

    await rnplWaitlistSubmission.save();

    // Automatically subscribe user to newsletter
    try {
      // Check if email already exists in newsletter
      const existingSubscription = await Newsletter.findOne({
        email: email.toLowerCase(),
      });

      if (!existingSubscription) {
        // Create new newsletter subscription with source as 'rnpl_waitlist'
        await Newsletter.create({
          email: email.toLowerCase(),
          source: "rnpl_waitlist",
          user: null, // RNPL waitlist users are not necessarily registered users
        });
        console.log(`Added ${email} to newsletter from RNPL waitlist`);
      } else if (existingSubscription.status === "unsubscribed") {
        // Reactivate subscription if previously unsubscribed
        existingSubscription.status = "active";
        existingSubscription.subscribed_at = new Date();
        existingSubscription.unsubscribed_at = null;
        await existingSubscription.save();
        console.log(
          `Reactivated newsletter subscription for ${email} from RNPL waitlist`
        );
      }
    } catch (newsletterError) {
      console.error("Error subscribing to newsletter:", newsletterError);
      // Don't fail the RNPL submission if newsletter subscription fails
    }

    // Send confirmation email to user
    try {
      const emailTemplate = await ejs.renderFile(
        path.join(__dirname, "../views/emails/rnpl-waitlist-confirmation.ejs"),
        {
          fullName,
          submissionId,
        }
      );

      await sendEmail({
        to: email,
        subject: "Welcome to RNPL Waitlist - Aplet360",
        html: emailTemplate,
      });
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
      // Don't fail the request if email fails
    }

    // Send notification email to admin
    try {
      const adminEmailTemplate = await ejs.renderFile(
        path.join(__dirname, "../views/emails/rnpl-waitlist-admin.ejs"),
        {
          fullName,
          email,
          phone,
          occupation,
          address,
          jobType,
          monthlyIncome,
          currentRentAmount,
          preferredLocation,
          submissionId,
        }
      );

      await sendEmail({
        to: "admin@aplet360.com",
        subject: `New RNPL Waitlist Registration - ${submissionId}`,
        html: adminEmailTemplate,
      });
    } catch (emailError) {
      console.error("Error sending admin notification email:", emailError);
      // Don't fail the request if email fails
    }

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Successfully joined RNPL waitlist",
      data: {
        submissionId,
        fullName,
        email,
      },
    });
  } catch (error) {
    console.error("Error submitting RNPL waitlist form:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to join waitlist. Please try again later.",
    });
  }
};

module.exports = {
  submitHomeServiceForm,
  submitBecomeArtisanForm,
  submitContactForm,
  submitDisputeResolutionForm,
  submitInspectionRequest,
  submitPropertyManagementForm,
  submitRNPLWaitlistForm,
};
