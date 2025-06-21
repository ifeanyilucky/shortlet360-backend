const express = require("express");
require("express-async-errors");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./db/connect");
const morgan = require("morgan");
const routes = require("./routes");
const rateLimit = require("express-rate-limit");
const errorHandlerMiddleware = require("./middlewares/error-handler");
const notFoundMiddleware = require("./middlewares/not-found");
const propertyRoutes = require("./routes/propertyRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const kycRoutes = require("./routes/kycRoutes");
const adminFormRoutes = require("./routes/adminFormRoutes");

dotenv.config();

// Move cors configuration before rate limiters
const corsOptions = {
  origin: "*", // Allow requests from any origin
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// General rate limiter for all routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    status: 429,
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: 429,
    message: "Too many login attempts, please try again after 15 minutes",
  },
});

// Apply rate limiters
app.use("/api/v1/auth", authLimiter);
app.use("/api/v1", limiter);

// Middleware
app.use(express.json());
app.use(express.json({ limit: "50mb" }));
app.use(
  express.urlencoded({ extended: true, limit: "50mb", parameterLimit: 50000 })
);
app.use(morgan("dev"));

// Routes
app.use("/api/v1", routes);
app.use("/api/v1/properties", propertyRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/favorites", favoriteRoutes);
app.use("/api/v1/kyc", kycRoutes);
app.use("/api/v1/admin/forms", adminFormRoutes);

// Error handling middleware
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const PORT = process.env.PORT || 3001;

const start = async () => {
  try {
    await connectDB(process.env.MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};

start();
