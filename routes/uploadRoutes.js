const express = require("express");
const router = express.Router();
const { uploads } = require("../utils/cloudinary");
const multer = require("multer");

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Single image upload route
router.post("/single", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Convert buffer to base64
    const fileStr = `data:${
      req.file.mimetype
    };base64,${req.file.buffer.toString("base64")}`;

    // Upload to cloudinary
    const uploadedUrl = await uploads(fileStr, "aplet360");

    res.status(200).json({
      success: true,
      message: "Upload successful",
      data: uploadedUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Upload failed",
      error: error.message,
    });
  }
});

// Multiple images upload route
router.post("/multiple", upload.array("images", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No image files provided" });
    }

    console.log("Files received:", req.files.length);
    console.log(
      "File types:",
      req.files.map((f) => f.mimetype)
    );

    const uploadPromises = req.files.map(async (file) => {
      try {
        // Validate file type
        if (!file.mimetype.startsWith("image/")) {
          console.error("Invalid file type:", file.mimetype);
          return null;
        }

        const fileStr = `data:${file.mimetype};base64,${file.buffer.toString(
          "base64"
        )}`;
        console.log("Attempting to upload file of size:", file.size);

        const uploadedUrl = await uploads(fileStr, "aplet360");
        return {
          url: uploadedUrl.url,
          public_id: uploadedUrl.public_id,
          asset_id: uploadedUrl.asset_id,
        };
      } catch (err) {
        console.error("Individual file upload error:", err);
        return null;
      }
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    const successfulUrls = uploadedUrls.filter((url) => url !== null);

    if (successfulUrls.length === 0) {
      console.error("All uploads failed");
      return res.status(500).json({
        success: false,
        message: "All uploads failed",
        urls: [],
      });
    }

    res.status(200).json({
      success: true,
      message:
        successfulUrls.length === req.files.length
          ? "All uploads successful"
          : `${successfulUrls.length} of ${req.files.length} uploads successful`,
      urls: successfulUrls,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Upload failed",
      error: error.message,
    });
  }
});

module.exports = router;
