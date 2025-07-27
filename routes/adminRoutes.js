const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const auth = require("../middlewares/authentication");
const adminAuth = require("../middlewares/adminAuth");

// Apply authentication and admin authorization to all routes
router.use(auth);
router.use(adminAuth);

// Dashboard statistics
router.get("/dashboard", adminController.getDashboardStats);

// User management
router.get("/users", adminController.getAllUsers);
router.get("/users/:id", adminController.getUserById);
router.patch("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);
router.patch("/users/:id/verify", adminController.verifyUser);
router.patch("/users/:id/activate", adminController.activateUser);

// Property management
router.get("/properties", adminController.getAllProperties);
router.get("/properties/:id", adminController.getPropertyById);
router.patch("/properties/:id", adminController.updateProperty);
router.delete("/properties/:id", adminController.deleteProperty);
router.patch("/properties/:id/activate", adminController.activateProperty);

// Booking management
router.get("/bookings", adminController.getAllBookings);
router.get("/bookings/:id", adminController.getBookingById);
router.patch("/bookings/:id/status", adminController.updateBookingStatus);

// KYC verification management
router.get("/kyc/pending", adminController.getPendingKycVerifications);
router.get("/kyc/verified", adminController.getAllKycVerifications);
router.get("/kyc/all", adminController.getUnifiedKycVerifications); // Unified endpoint for all KYC records with advanced filtering
router.patch("/kyc/:userId/tier1", adminController.updateTier1Verification);
router.patch("/kyc/:userId/tier2", adminController.updateTier2Verification);
router.patch("/kyc/:userId/tier3", adminController.updateTier3Verification);

// Tenant management
router.get("/tenants", adminController.getAllTenants);
router.get("/tenants/statistics", adminController.getTenantStatistics);
router.get("/tenants/:id", adminController.getTenantById);
router.patch("/tenants/:id/status", adminController.updateTenantStatus);
router.patch(
  "/tenants/:id/payment-status",
  adminController.updateTenantPaymentStatus
);
router.delete("/tenants/:id", adminController.deleteTenant);
router.post("/tenants/:id/rent-payment", adminController.addRentPayment);
router.patch(
  "/tenants/:id/maintenance/:requestId",
  adminController.updateMaintenanceRequest
);

module.exports = router;
