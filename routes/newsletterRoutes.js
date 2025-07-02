const express = require("express");
const router = express.Router();
const newsletterController = require("../controllers/newsletterController");
const auth = require("../middlewares/authentication");

// Public routes
router.post("/subscribe", newsletterController.subscribeToNewsletter);
router.get("/unsubscribe", newsletterController.unsubscribeFromNewsletter);

// Protected routes (Admin only)
router.get("/subscribers", auth, newsletterController.getAllSubscribers);
router.get("/subscribers/export", auth, newsletterController.exportSubscribers);
router.get("/stats", auth, newsletterController.getNewsletterStats);
router.post("/send", auth, newsletterController.sendNewsletter);

module.exports = router;
