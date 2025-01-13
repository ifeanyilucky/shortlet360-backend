const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/propertyController");
const auth = require("../middlewares/authentication");

router.post("/", auth, propertyController.createProperty);
router.get("/", propertyController.getAllProperties);
router.get("/statistics", auth, propertyController.getOwnerStatistics);
router.get("/:id", propertyController.getProperty);
router.put("/:id", auth, propertyController.updateProperty);
router.delete("/:id", auth, propertyController.deleteProperty);
router.post("/:id/check-availability", propertyController.checkAvailability);

module.exports = router;
