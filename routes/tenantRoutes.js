const express = require("express");
const router = express.Router();
const tenantController = require("../controllers/tenantController");
const auth = require("../middlewares/authentication");

// Apply authentication middleware to all routes
router.use(auth);

// Get all tenants (for property owners)
router.get("/", tenantController.getAllTenants);

// Get tenant statistics (for property owners)
router.get("/statistics", tenantController.getTenantStatistics);

// Get user's tenant history
router.get("/user", tenantController.getUserTenants);

// Check if user has already paid for a property
router.get(
  "/check-payment/:property_id",
  tenantController.checkUserPaymentStatus
);

// Get specific tenant
router.get("/:id", tenantController.getTenant);

// Create new tenant (when payment is successful)
router.post("/", tenantController.createTenant);

// Update tenant status (property owners only)
router.patch("/:id/status", tenantController.updateTenantStatus);

// Add rent payment
router.post("/:id/rent-payment", tenantController.addRentPayment);

// Add maintenance request
router.post("/:id/maintenance", tenantController.addMaintenanceRequest);

// Update maintenance request status (property owners only)
router.patch(
  "/:id/maintenance/:requestId",
  tenantController.updateMaintenanceRequest
);

module.exports = router;
