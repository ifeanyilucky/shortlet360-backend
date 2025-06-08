const express = require("express");
const router = express.Router();
const { uploads } = require("../utils/cloudinary");
const multer = require("multer");

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Image upload configuration (5MB limit)
const imageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for this endpoint"), false);
    }
  },
});

// Video upload configuration (100MB limit)
const videoUpload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    console.log(
      "Video file filter - MIME type:",
      file.mimetype,
      "Size:",
      file.size
    );

    // Check if file is a video
    if (file.mimetype.startsWith("video/")) {
      // Additional check for common video formats
      const allowedFormats = [
        "video/mp4",
        "video/avi",
        "video/mov",
        "video/wmv",
        "video/flv",
        "video/webm",
        "video/mkv",
      ];
      if (allowedFormats.includes(file.mimetype)) {
        cb(null, true);
      } else {
        console.log("Unsupported video format:", file.mimetype);
        cb(
          new Error(
            `Unsupported video format: ${
              file.mimetype
            }. Supported formats: ${allowedFormats.join(", ")}`
          ),
          false
        );
      }
    } else {
      cb(new Error("Only video files are allowed for this endpoint"), false);
    }
  },
});

// Mixed media upload configuration (100MB limit)
const mediaUpload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for mixed media
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image or video
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed"), false);
    }
  },
});

// Legacy upload for backward compatibility
const upload = imageUpload;

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

// Single video upload route
router.post("/video/single", videoUpload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided" });
    }

    console.log(
      "Single video upload - File size:",
      Math.round(req.file.size / 1024 / 1024),
      "MB"
    );
    console.log("Single video upload - MIME type:", req.file.mimetype);

    // Check file size (100MB limit)
    if (req.file.size > 100 * 1024 * 1024) {
      return res.status(400).json({
        error: "File too large",
        details: `File size ${Math.round(
          req.file.size / 1024 / 1024
        )}MB exceeds 100MB limit`,
      });
    }

    // Convert buffer to base64
    const fileStr = `data:${
      req.file.mimetype
    };base64,${req.file.buffer.toString("base64")}`;

    // Upload to cloudinary with video-specific options
    const uploadedUrl = await uploads(fileStr, "aplet360/videos");

    res.status(200).json({
      success: true,
      message: "Video upload successful",
      data: uploadedUrl,
    });
  } catch (error) {
    console.error("Single video upload error:", {
      message: error.message,
      code: error.code,
      name: error.name,
      fileSize: req.file?.size,
      mimeType: req.file?.mimetype,
    });
    res.status(500).json({
      success: false,
      message: "Video upload failed",
      error: error.message,
    });
  }
});

// Multiple videos upload route
router.post(
  "/video/multiple",
  videoUpload.array("videos", 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No video files provided" });
      }

      console.log("Videos received:", req.files.length);
      console.log(
        "Video file types:",
        req.files.map((f) => f.mimetype)
      );

      const uploadPromises = req.files.map(async (file, index) => {
        try {
          // Validate file type (additional check)
          if (!file.mimetype.startsWith("video/")) {
            console.error(
              `File ${index + 1}: Invalid file type:`,
              file.mimetype
            );
            return null;
          }

          // Check file size (100MB limit)
          if (file.size > 100 * 1024 * 1024) {
            console.error(
              `File ${index + 1}: File too large:`,
              Math.round(file.size / 1024 / 1024),
              "MB"
            );
            return null;
          }

          console.log(
            `File ${index + 1}: Starting upload - Size: ${Math.round(
              file.size / 1024 / 1024
            )}MB, Type: ${file.mimetype}`
          );

          const fileStr = `data:${file.mimetype};base64,${file.buffer.toString(
            "base64"
          )}`;

          const uploadedUrl = await uploads(fileStr, "aplet360/videos");
          console.log(`File ${index + 1}: Upload successful`);

          return {
            url: uploadedUrl.url,
            public_id: uploadedUrl.public_id,
            asset_id: uploadedUrl.asset_id,
          };
        } catch (err) {
          console.error(`File ${index + 1}: Individual video upload error:`, {
            message: err.message,
            code: err.code,
            name: err.name,
            fileSize: file.size,
            mimeType: file.mimetype,
          });
          return null;
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const successfulUrls = uploadedUrls.filter((url) => url !== null);
      const failedCount = req.files.length - successfulUrls.length;

      if (successfulUrls.length === 0) {
        console.error(
          "All video uploads failed - Total files:",
          req.files.length
        );
        return res.status(500).json({
          success: false,
          message: "All video uploads failed",
          details: `${failedCount} out of ${req.files.length} uploads failed. Check server logs for detailed error information.`,
          urls: [],
        });
      }

      res.status(200).json({
        success: true,
        message:
          successfulUrls.length === req.files.length
            ? "All video uploads successful"
            : `${successfulUrls.length} of ${req.files.length} video uploads successful`,
        urls: successfulUrls,
      });
    } catch (error) {
      console.error("Video upload error:", error);
      res.status(500).json({
        success: false,
        message: "Video upload failed",
        error: error.message,
      });
    }
  }
);

// Mixed media upload route (images and videos)
router.post(
  "/media/multiple",
  mediaUpload.array("media", 10),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No media files provided" });
      }

      console.log("Media files received:", req.files.length);
      console.log(
        "Media file types:",
        req.files.map((f) => f.mimetype)
      );

      const uploadPromises = req.files.map(async (file) => {
        try {
          // Validate file type (additional check)
          if (
            !file.mimetype.startsWith("image/") &&
            !file.mimetype.startsWith("video/")
          ) {
            console.error("Invalid file type:", file.mimetype);
            return null;
          }

          const fileStr = `data:${file.mimetype};base64,${file.buffer.toString(
            "base64"
          )}`;
          console.log("Attempting to upload media file of size:", file.size);

          // Determine folder based on file type
          const folder = file.mimetype.startsWith("video/")
            ? "aplet360/videos"
            : "aplet360/images";

          const uploadedUrl = await uploads(fileStr, folder);
          return {
            url: uploadedUrl.url,
            public_id: uploadedUrl.public_id,
            asset_id: uploadedUrl.asset_id,
            type: file.mimetype.startsWith("video/") ? "video" : "image",
          };
        } catch (err) {
          console.error("Individual media upload error:", err);
          return null;
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const successfulUrls = uploadedUrls.filter((url) => url !== null);

      if (successfulUrls.length === 0) {
        console.error("All media uploads failed");
        return res.status(500).json({
          success: false,
          message: "All media uploads failed",
          urls: [],
        });
      }

      res.status(200).json({
        success: true,
        message:
          successfulUrls.length === req.files.length
            ? "All media uploads successful"
            : `${successfulUrls.length} of ${req.files.length} media uploads successful`,
        urls: successfulUrls,
      });
    } catch (error) {
      console.error("Media upload error:", error);
      res.status(500).json({
        success: false,
        message: "Media upload failed",
        error: error.message,
      });
    }
  }
);

module.exports = router;
