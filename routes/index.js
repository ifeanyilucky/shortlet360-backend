const express = require("express");
const router = express.Router();

const authRouter = require("./auth");
const userRouter = require("./user");
const propertyRouter = require("./propertyRoutes");
const bookingRouter = require("./bookingRoutes");
const uploadRoutes = require("./uploadRoutes");
const kycRoutes = require("./kycRoutes");
const adminRoutes = require("./adminRoutes");
const adminAuthRoutes = require("./adminAuthRoutes");
const formRoutes = require("./formRoutes");
const referralRoutes = require("./referralRoutes");
const blogRoutes = require("./blogRoutes");
const discountCodeRoutes = require("./discountCodeRoutes");

router.use("/auth", authRouter);
router.use("/auth/admin", adminAuthRoutes);
router.use("/users", userRouter);
router.use("/property", propertyRouter);
router.use("/booking", bookingRouter);
router.use("/upload", uploadRoutes);
router.use("/kyc", kycRoutes);
router.use("/admin", adminRoutes);
router.use("/forms", formRoutes);
router.use("/referral", referralRoutes);
router.use("/blog", blogRoutes);
router.use("/discount-codes", discountCodeRoutes);

module.exports = router;
