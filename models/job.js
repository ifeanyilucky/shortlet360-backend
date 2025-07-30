const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      maxlength: [100, "Job title cannot exceed 100 characters"],
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
      enum: [
        "Engineering",
        "Product",
        "Design",
        "Marketing",
        "Sales",
        "Customer Support",
        "Operations",
        "Finance",
        "Human Resources",
        "Legal",
        "Other",
      ],
    },
    location: {
      type: String,
      required: [true, "Job location is required"],
      trim: true,
    },
    jobType: {
      type: String,
      required: [true, "Job type is required"],
      enum: ["Full-time", "Part-time", "Contract", "Internship", "Freelance"],
    },
    experienceLevel: {
      type: String,
      required: [true, "Experience level is required"],
      enum: ["Entry", "Mid", "Senior", "Lead", "Executive"],
    },
    salary: {
      min: {
        type: Number,
        required: [true, "Minimum salary is required"],
      },
      max: {
        type: Number,
        required: [true, "Maximum salary is required"],
      },
      currency: {
        type: String,
        default: "NGN",
        enum: ["NGN", "USD", "EUR", "GBP"],
      },
      period: {
        type: String,
        default: "yearly",
        enum: ["hourly", "daily", "weekly", "monthly", "yearly"],
      },
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
      minlength: [50, "Job description must be at least 50 characters"],
    },
    responsibilities: [
      {
        type: String,
        required: [true, "At least one responsibility is required"],
        trim: true,
      },
    ],
    requirements: [
      {
        type: String,
        required: [true, "At least one requirement is required"],
        trim: true,
      },
    ],
    niceToHave: [
      {
        type: String,
        trim: true,
      },
    ],
    benefits: [
      {
        type: String,
        trim: true,
      },
    ],
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["draft", "published", "closed", "archived"],
      default: "draft",
    },
    applicationDeadline: {
      type: Date,
      required: [true, "Application deadline is required"],
    },
    applicationCount: {
      type: Number,
      default: 0,
    },
    isRemote: {
      type: Boolean,
      default: false,
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    short_id: {
      type: String,
      unique: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Note: short_id is now generated in the controller to avoid validation issues

// Index for better query performance
jobSchema.index({ status: 1, department: 1, location: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ applicationDeadline: 1 });

module.exports = mongoose.model("Job", jobSchema);
