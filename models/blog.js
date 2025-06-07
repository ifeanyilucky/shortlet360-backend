const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: false,
      unique: true,
      lowercase: true,
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
      maxlength: 500,
    },
    featured_image: {
      url: String,
      public_id: String,
      asset_id: String,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    category: {
      type: String,
      required: false,
      enum: [
        "",
        "tips",
        "guides",
        "news",
        "property-management",
        "travel",
        "lifestyle",
        "market-insights",
      ],
      default: "tips",
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    is_featured: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    reading_time: {
      type: Number, // in minutes
      default: 5,
    },
    meta_title: {
      type: String,
      maxlength: 60,
    },
    meta_description: {
      type: String,
      maxlength: 160,
    },
    published_at: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create slug from title before saving
blogSchema.pre("save", function (next) {
  // Always generate slug if title exists and slug is not set
  if (this.title && (!this.slug || this.isModified("title"))) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/\s+/g, "-")
      .trim();
  }

  // Handle empty category
  if (
    this.category === "" ||
    this.category === null ||
    this.category === undefined
  ) {
    this.category = "tips";
  }

  // Set published_at when status changes to published
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.published_at
  ) {
    this.published_at = new Date();
  }

  // Generate excerpt from content if not provided
  if (this.isModified("content") && !this.excerpt) {
    this.excerpt =
      this.content
        .replace(/<[^>]*>/g, "") // Remove HTML tags
        .substring(0, 200) + "...";
  }

  next();
});

// Index for better query performance
blogSchema.index({ status: 1, published_at: -1 });
blogSchema.index({ slug: 1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ category: 1 });

module.exports = mongoose.model("Blog", blogSchema);
