const Blog = require("../models/blog");
const User = require("../models/user");
const {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} = require("../errors");

const blogController = {
  // Create a new blog post (Admin only)
  createBlog: async (req, res) => {
    const {
      title,
      content,
      excerpt,
      category,
      tags,
      status,
      is_featured,
      meta_title,
      meta_description,
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      throw new BadRequestError("Title and content are required");
    }

    // Check if user is admin
    if (req.user.role !== "admin") {
      throw new UnauthorizedError("Only admins can create blog posts");
    }

    const blogData = {
      title,
      content,
      excerpt,
      category: category && category.trim() !== "" ? category : "tips", // Default to "tips" if empty
      tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
      status: status || "draft",
      is_featured: is_featured || false,
      meta_title,
      meta_description,
      author: req.user._id,
    };

    // Add featured image if provided
    if (req.body.featured_image) {
      blogData.featured_image = req.body.featured_image;
    }

    const blog = new Blog(blogData);
    await blog.save();

    // Populate author details
    await blog.populate("author", "first_name last_name email");

    res.status(201).json({
      success: true,
      message: "Blog post created successfully",
      data: blog,
    });
  },

  // Get all blog posts with filtering and pagination
  getAllBlogs: async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter = {};

    // Status filter (public users only see published posts)
    if (req.user && req.user.role === "admin") {
      if (req.query.status) {
        filter.status = req.query.status;
      }
    } else {
      filter.status = "published";
    }

    // Category filter
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Tags filter
    if (req.query.tags) {
      const tags = req.query.tags.split(",").map((tag) => tag.trim());
      filter.tags = { $in: tags };
    }

    // Search filter
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { content: { $regex: req.query.search, $options: "i" } },
        { tags: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Featured filter
    if (req.query.featured === "true") {
      filter.is_featured = true;
    }

    // Get total count for pagination
    const total = await Blog.countDocuments(filter);

    // Get filtered and paginated blogs
    const blogs = await Blog.find(filter)
      .populate("author", "first_name last_name email")
      .sort({ published_at: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: blogs,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        pages: Math.ceil(total / limit),
        perPage: limit,
        totalDocs: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  },

  // Get a single blog post by slug
  getBlogBySlug: async (req, res) => {
    const { slug } = req.params;

    const blog = await Blog.findOne({ slug }).populate(
      "author",
      "first_name last_name email"
    );

    if (!blog) {
      throw new NotFoundError("Blog post not found");
    }

    // Check if user can view this blog
    if (
      blog.status !== "published" &&
      (!req.user || req.user.role !== "admin")
    ) {
      throw new NotFoundError("Blog post not found");
    }

    // Increment views count
    blog.views += 1;
    await blog.save();

    res.status(200).json({
      success: true,
      data: blog,
    });
  },

  // Get a single blog post by ID (Admin only)
  getBlogById: async (req, res) => {
    const { id } = req.params;

    if (req.user.role !== "admin") {
      throw new UnauthorizedError("Only admins can access this endpoint");
    }

    const blog = await Blog.findById(id).populate(
      "author",
      "first_name last_name email"
    );

    if (!blog) {
      throw new NotFoundError("Blog post not found");
    }

    res.status(200).json({
      success: true,
      data: blog,
    });
  },

  // Update a blog post (Admin only)
  updateBlog: async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    if (req.user.role !== "admin") {
      throw new UnauthorizedError("Only admins can update blog posts");
    }

    // Process tags if provided
    if (updateData.tags && typeof updateData.tags === "string") {
      updateData.tags = updateData.tags.split(",").map((tag) => tag.trim());
    }

    // Handle empty category
    if (
      updateData.category !== undefined &&
      updateData.category.trim() === ""
    ) {
      updateData.category = "tips"; // Default to "tips" if empty
    }

    const blog = await Blog.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("author", "first_name last_name email");

    if (!blog) {
      throw new NotFoundError("Blog post not found");
    }

    res.status(200).json({
      success: true,
      message: "Blog post updated successfully",
      data: blog,
    });
  },

  // Delete a blog post (Admin only)
  deleteBlog: async (req, res) => {
    const { id } = req.params;

    if (req.user.role !== "admin") {
      throw new UnauthorizedError("Only admins can delete blog posts");
    }

    const blog = await Blog.findByIdAndDelete(id);

    if (!blog) {
      throw new NotFoundError("Blog post not found");
    }

    res.status(200).json({
      success: true,
      message: "Blog post deleted successfully",
    });
  },

  // Get blog categories
  getCategories: async (req, res) => {
    const categories = [
      "tips",
      "guides",
      "news",
      "property-management",
      "travel",
      "lifestyle",
      "market-insights",
    ];

    res.status(200).json({
      success: true,
      data: categories,
    });
  },

  // Get popular tags
  getPopularTags: async (req, res) => {
    const tags = await Blog.aggregate([
      { $match: { status: "published" } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    res.status(200).json({
      success: true,
      data: tags.map((tag) => ({ name: tag._id, count: tag.count })),
    });
  },

  // Get blog statistics (Admin only)
  getBlogStats: async (req, res) => {
    if (req.user.role !== "admin") {
      throw new UnauthorizedError("Only admins can access blog statistics");
    }

    const stats = await Blog.aggregate([
      {
        $group: {
          _id: null,
          totalBlogs: { $sum: 1 },
          publishedBlogs: {
            $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
          },
          draftBlogs: {
            $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] },
          },
          totalViews: { $sum: "$views" },
          featuredBlogs: {
            $sum: { $cond: ["$is_featured", 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalBlogs: 0,
      publishedBlogs: 0,
      draftBlogs: 0,
      totalViews: 0,
      featuredBlogs: 0,
    };

    res.status(200).json({
      success: true,
      data: result,
    });
  },
};

module.exports = blogController;
