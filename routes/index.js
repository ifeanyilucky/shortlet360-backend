const express = require("express");
const router = express.Router();

const authRouter = require("./auth");
const userRouter = require("./user");
const propertyRouter = require("./propertyRoutes");
const bookingRouter = require("./bookingRoutes");
const tenantRouter = require("./tenantRoutes");
const uploadRoutes = require("./uploadRoutes");
const kycRoutes = require("./kycRoutes");
const adminRoutes = require("./adminRoutes");
const adminAuthRoutes = require("./adminAuthRoutes");
const formRoutes = require("./formRoutes");
const referralRoutes = require("./referralRoutes");
const blogRoutes = require("./blogRoutes");
const discountCodeRoutes = require("./discountCodeRoutes");
const newsletterRoutes = require("./newsletterRoutes");
const jobController = require("../controllers/jobController");

router.use("/auth", authRouter);
router.use("/auth/admin", adminAuthRoutes);
router.use("/users", userRouter);
router.use("/property", propertyRouter);
router.use("/booking", bookingRouter);
router.use("/tenant", tenantRouter);
router.use("/upload", uploadRoutes);
router.use("/kyc", kycRoutes);
router.use("/admin", adminRoutes);
router.use("/forms", formRoutes);
router.use("/referral", referralRoutes);
router.use("/blog", blogRoutes);
router.use("/discount-codes", discountCodeRoutes);
router.use("/newsletter", newsletterRoutes);

// Public job routes (no authentication required)
router.get("/jobs", jobController.getPublicJobs);

module.exports = router;
