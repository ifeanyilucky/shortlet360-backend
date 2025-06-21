const express = require("express");
const router = express.Router();
const {
  getAllFormSubmissions,
  getFormSubmissionById,
  updateFormSubmissionStatus,
  getFormSubmissionStats,
} = require("../controllers/adminFormController");
const auth = require("../middlewares/authentication");
const adminAuth = require("../middlewares/adminAuth");

// Apply authentication and admin authorization to all routes
router.use(auth);
router.use(adminAuth);

/**
 * @route   GET /api/admin/forms
 * @desc    Get all form submissions with filtering and pagination
 * @access  Admin only
 * @query   {
 *   page: number,
 *   limit: number,
 *   form_type: string,
 *   status: string,
 *   priority: string,
 *   search: string,
 *   start_date: string,
 *   end_date: string
 * }
 */
router.get("/", getAllFormSubmissions);

/**
 * @route   GET /api/admin/forms/stats
 * @desc    Get form submission statistics
 * @access  Admin only
 */
router.get("/stats", getFormSubmissionStats);

/**
 * @route   GET /api/admin/forms/:id
 * @desc    Get form submission by ID
 * @access  Admin only
 */
router.get("/:id", getFormSubmissionById);

/**
 * @route   PUT /api/admin/forms/:id
 * @desc    Update form submission status and details
 * @access  Admin only
 * @body    {
 *   status?: string,
 *   priority?: string,
 *   admin_notes?: string,
 *   assigned_to?: string
 * }
 */
router.put("/:id", updateFormSubmissionStatus);

module.exports = router;
