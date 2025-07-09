const { StatusCodes } = require("http-status-codes");
const {
  HomeService,
  ArtisanApplication,
  ContactForm,
  DisputeResolution,
  InspectionRequest,
  PropertyManagement,
  RNPLWaitlist,
} = require("../models/formSubmission");

/**
 * Get all form submissions with filtering and pagination
 */
const getAllFormSubmissions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      form_type,
      status,
      priority,
      search,
      start_date,
      end_date,
    } = req.query;

    // Build filter object
    const filter = {};

    if (form_type) filter.form_type = form_type;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Date range filter
    if (start_date || end_date) {
      filter.createdAt = {};
      if (start_date) filter.createdAt.$gte = new Date(start_date);
      if (end_date) filter.createdAt.$lte = new Date(end_date);
    }

    // Search filter (across multiple fields)
    if (search) {
      filter.$or = [
        { submission_id: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { full_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { phone_number: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
        { service: { $regex: search, $options: "i" } },
        { skill_category: { $regex: search, $options: "i" } },
        { property_type: { $regex: search, $options: "i" } },
      ];
    }

    // Get all form types
    const models = [
      { model: HomeService, type: "home_service" },
      { model: ArtisanApplication, type: "artisan_application" },
      { model: ContactForm, type: "contact" },
      { model: DisputeResolution, type: "dispute_resolution" },
      { model: InspectionRequest, type: "inspection_request" },
      { model: PropertyManagement, type: "property_management" },
      { model: RNPLWaitlist, type: "rnpl_waitlist" },
    ];

    let allSubmissions = [];

    // If specific form type is requested
    if (form_type) {
      const modelInfo = models.find((m) => m.type === form_type);
      if (modelInfo) {
        const submissions = await modelInfo.model
          .find(filter)
          .populate("assigned_to", "first_name last_name email")
          .populate("resolved_by", "first_name last_name email")
          .sort({ createdAt: -1 });
        allSubmissions = submissions;
      }
    } else {
      // Get from all models
      for (const modelInfo of models) {
        const submissions = await modelInfo.model
          .find(filter)
          .populate("assigned_to", "first_name last_name email")
          .populate("resolved_by", "first_name last_name email")
          .sort({ createdAt: -1 });
        allSubmissions = allSubmissions.concat(submissions);
      }
    }

    // Sort all submissions by creation date
    allSubmissions.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedSubmissions = allSubmissions.slice(startIndex, endIndex);

    // Get statistics
    const stats = {
      total: allSubmissions.length,
      pending: allSubmissions.filter((s) => s.status === "pending").length,
      in_progress: allSubmissions.filter((s) => s.status === "in_progress")
        .length,
      resolved: allSubmissions.filter((s) => s.status === "resolved").length,
      closed: allSubmissions.filter((s) => s.status === "closed").length,
      high_priority: allSubmissions.filter((s) => s.priority === "high").length,
      urgent: allSubmissions.filter((s) => s.priority === "urgent").length,
    };

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        submissions: paginatedSubmissions,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(allSubmissions.length / limit),
          total_items: allSubmissions.length,
          items_per_page: parseInt(limit),
        },
        stats,
      },
    });
  } catch (error) {
    console.error("Error fetching form submissions:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch form submissions",
      error: error.message,
    });
  }
};

/**
 * Get form submission by ID
 */
const getFormSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find in all models
    const models = [
      HomeService,
      ArtisanApplication,
      ContactForm,
      DisputeResolution,
      InspectionRequest,
      PropertyManagement,
    ];

    let submission = null;
    for (const Model of models) {
      submission = await Model.findById(id)
        .populate("assigned_to", "first_name last_name email")
        .populate("resolved_by", "first_name last_name email");
      if (submission) break;
    }

    if (!submission) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Form submission not found",
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    console.error("Error fetching form submission:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch form submission",
      error: error.message,
    });
  }
};

/**
 * Update form submission status
 */
const updateFormSubmissionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, admin_notes, assigned_to } = req.body;
    const adminId = req.user.id;

    // Validate status
    const validStatuses = ["pending", "in_progress", "resolved", "closed"];
    if (status && !validStatuses.includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid status",
      });
    }

    // Validate priority
    const validPriorities = ["low", "medium", "high", "urgent"];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid priority",
      });
    }

    // Try to find and update in all models
    const models = [
      HomeService,
      ArtisanApplication,
      ContactForm,
      DisputeResolution,
      InspectionRequest,
      PropertyManagement,
    ];

    let submission = null;
    for (const Model of models) {
      const updateData = {};
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;
      if (admin_notes) updateData.admin_notes = admin_notes;
      if (assigned_to) updateData.assigned_to = assigned_to;

      // If status is resolved or closed, set resolved fields
      if (status === "resolved" || status === "closed") {
        updateData.resolved_at = new Date();
        updateData.resolved_by = adminId;
      }

      submission = await Model.findByIdAndUpdate(id, updateData, { new: true })
        .populate("assigned_to", "first_name last_name email")
        .populate("resolved_by", "first_name last_name email");

      if (submission) break;
    }

    if (!submission) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Form submission not found",
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Form submission updated successfully",
      data: submission,
    });
  } catch (error) {
    console.error("Error updating form submission:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to update form submission",
      error: error.message,
    });
  }
};

/**
 * Get form submission statistics
 */
const getFormSubmissionStats = async (req, res) => {
  try {
    const models = [
      { model: HomeService, type: "home_service" },
      { model: ArtisanApplication, type: "artisan_application" },
      { model: ContactForm, type: "contact" },
      { model: DisputeResolution, type: "dispute_resolution" },
      { model: InspectionRequest, type: "inspection_request" },
      { model: PropertyManagement, type: "property_management" },
      { model: RNPLWaitlist, type: "rnpl_waitlist" },
    ];

    const stats = {};
    let totalSubmissions = 0;
    let totalPending = 0;
    let totalInProgress = 0;
    let totalResolved = 0;
    let totalClosed = 0;

    for (const modelInfo of models) {
      const total = await modelInfo.model.countDocuments();
      const pending = await modelInfo.model.countDocuments({
        status: "pending",
      });
      const inProgress = await modelInfo.model.countDocuments({
        status: "in_progress",
      });
      const resolved = await modelInfo.model.countDocuments({
        status: "resolved",
      });
      const closed = await modelInfo.model.countDocuments({ status: "closed" });

      stats[modelInfo.type] = {
        total,
        pending,
        in_progress: inProgress,
        resolved,
        closed,
      };

      totalSubmissions += total;
      totalPending += pending;
      totalInProgress += inProgress;
      totalResolved += resolved;
      totalClosed += closed;
    }

    stats.overall = {
      total: totalSubmissions,
      pending: totalPending,
      in_progress: totalInProgress,
      resolved: totalResolved,
      closed: totalClosed,
    };

    res.status(StatusCodes.OK).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching form submission stats:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch form submission statistics",
      error: error.message,
    });
  }
};

module.exports = {
  getAllFormSubmissions,
  getFormSubmissionById,
  updateFormSubmissionStatus,
  getFormSubmissionStats,
};
