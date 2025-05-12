const express = require("express");
const router = express.Router();

const authRouter = require("./auth");
const userRouter = require("./user");
const propertyRouter = require("./propertyRoutes");
const bookingRouter = require("./bookingRoutes");
const uploadRoutes = require('./uploadRoutes');
const kycRoutes = require('./kycRoutes');

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/property", propertyRouter);
router.use("/booking", bookingRouter);
router.use('/upload', uploadRoutes);
router.use('/kyc', kycRoutes);

module.exports = router;
