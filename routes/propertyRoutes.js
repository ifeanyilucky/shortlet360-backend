const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/propertyController");
const auth = require("../middlewares/authentication");
const { verifyOwnerKyc } = require("../middlewares/kycVerification");

// Public routes
router.get("/", propertyController.getAllProperties);

// Authenticated routes for owners
router.post("/", auth, verifyOwnerKyc, propertyController.createProperty);
router.get("/owner", auth, propertyController.getOwnerProperties);
router.get("/statistics", auth, propertyController.getOwnerStatistics);
router.get("/:id", propertyController.getProperty);
router.put("/:id", auth, verifyOwnerKyc, propertyController.updateProperty);
router.delete("/:id", auth, propertyController.deleteProperty);
router.post("/:id/check-availability", propertyController.checkAvailability);
router.put(
  "/:id/unavailable-dates",
  auth,
  verifyOwnerKyc,
  propertyController.updateUnavailableDates
);

// Admin-only route to update publication status
router.patch(
  "/:id/publication-status",
  auth,
  propertyController.updatePublicationStatus
);

module.exports = router;
