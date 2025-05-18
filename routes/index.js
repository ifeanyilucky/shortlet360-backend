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

router.use("/auth", authRouter);
router.use("/auth/admin", adminAuthRoutes);
router.use("/users", userRouter);
router.use("/property", propertyRouter);
router.use("/booking", bookingRouter);
router.use("/upload", uploadRoutes);
router.use("/kyc", kycRoutes);
router.use("/admin", adminRoutes);
router.use("/forms", formRoutes);

module.exports = router;
