const express = require("express");
const router = express.Router();
const formController = require("../controllers/formController");

// Home Service form submission
router.post("/home-service", formController.submitHomeServiceForm);

// Become Artisan form submission
router.post("/become-artisan", formController.submitBecomeArtisanForm);

// Contact form submission
router.post("/contact", formController.submitContactForm);

module.exports = router;
