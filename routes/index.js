const express = require("express");
const router = express.Router();

const authRouter = require("./auth");
const userRouter = require("./user");
const propertyRouter = require("./propertyRoutes");
const bookingRouter = require("./bookingRoutes");
const uploadRoutes = require('./uploadRoutes');

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/property", propertyRouter);
router.use("/booking", bookingRouter);
router.use('/upload', uploadRoutes);

module.exports = router;
