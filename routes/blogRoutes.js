const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");
const auth = require("../middlewares/authentication");

// Public routes
router.get("/", blogController.getAllBlogs);
router.get("/categories", blogController.getCategories);
router.get("/tags", blogController.getPopularTags);
router.get("/slug/:slug", blogController.getBlogBySlug);

// Protected routes (Admin only)
router.post("/", auth, blogController.createBlog);
router.get("/stats", auth, blogController.getBlogStats);
router.get("/:id", auth, blogController.getBlogById);
router.put("/:id", auth, blogController.updateBlog);
router.delete("/:id", auth, blogController.deleteBlog);

module.exports = router;
