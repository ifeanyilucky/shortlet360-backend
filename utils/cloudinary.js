const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// Configure cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "duvwweuhj",
  api_key: process.env.CLOUDINARY_API_KEY || "823768151355777",
  api_secret:
    process.env.CLOUDINARY_API_SECRET || "-af_qO_IlW8EvyMlgkFRAgfVgkA",
});

// Validate configuration
const validateConfig = () => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      "Missing Cloudinary configuration. Please check your environment variables."
    );
  }
  console.log("Cloudinary configured successfully");
};

// Call validation on startup
validateConfig();

/**
 * Uploads a file to Cloudinary
 * @param {string} file - The file path or base64 string
 * @param {string} folder - The destination folder in Cloudinary
 * @param {Object} options - Additional upload options
 * @returns {Promise<Object>} - Returns the upload result
 */
const uploads = async (file, folder, options = {}) => {
  try {
    // Input validation
    if (!file) throw new Error("No file provided");
    if (!folder) throw new Error("No folder specified");

    console.log("Attempting to upload file to folder:", folder);

    // Log file size for debugging
    if (file.startsWith("data:")) {
      const base64Data = file.split(",")[1];
      const sizeInBytes = (base64Data.length * 3) / 4;
      console.log(
        "File size (estimated):",
        Math.round(sizeInBytes / 1024 / 1024),
        "MB"
      );
    }

    // Determine if this is a video based on folder or file content
    const isVideo = folder.includes("videos") || file.includes("data:video/");

    const uploadOptions = {
      folder,
      resource_type: "auto",
      quality: "auto",
      fetch_format: "auto",
      timeout: 300000, // 5 minutes timeout
      ...options,
    };

    // Add video-specific options
    if (isVideo) {
      uploadOptions.resource_type = "video";
      uploadOptions.video_codec = "auto";
      uploadOptions.quality = "auto:good";
      uploadOptions.format = "mp4"; // Ensure consistent video format
      uploadOptions.chunk_size = 6000000; // 6MB chunks for large files

      // Handle video processing based on file size
      if (file.startsWith("data:")) {
        const base64Data = file.split(",")[1];
        const sizeInBytes = (base64Data.length * 3) / 4;

        if (sizeInBytes > 30 * 1024 * 1024) {
          // 30MB threshold
          // For large videos, skip transformations to avoid sync processing issues
          console.log(
            "Large video detected, skipping transformations for faster upload"
          );
          delete uploadOptions.quality;
          delete uploadOptions.fetch_format;
          delete uploadOptions.video_codec;
          delete uploadOptions.format;
        } else if (sizeInBytes > 10 * 1024 * 1024) {
          // 10-30MB range
          // Use async processing for medium-sized videos
          uploadOptions.eager_async = true;
          uploadOptions.eager = [
            { quality: "auto:good", fetch_format: "auto" },
          ];
          console.log("Using asynchronous processing for medium-sized video");
        } else {
          // Small videos can use synchronous transformations
          uploadOptions.transformation = [
            { quality: "auto:good" },
            { fetch_format: "auto" },
          ];
        }
      } else {
        // For non-base64 uploads, use minimal processing
        uploadOptions.eager_async = true;
        uploadOptions.eager = [{ quality: "auto:good", fetch_format: "auto" }];
      }
    }

    console.log("Upload options:", {
      ...uploadOptions,
      timeout: uploadOptions.timeout,
    });

    // Use upload_large for large video files to handle them more efficiently
    let result;
    if (isVideo && file.startsWith("data:")) {
      const base64Data = file.split(",")[1];
      const sizeInBytes = (base64Data.length * 3) / 4;

      if (sizeInBytes > 50 * 1024 * 1024) {
        // 50MB threshold for upload_large
        console.log("Using upload_large for video file over 50MB");
        result = await cloudinary.uploader.upload_large(file, uploadOptions);
      } else {
        result = await cloudinary.uploader.upload(file, uploadOptions);
      }
    } else {
      result = await cloudinary.uploader.upload(file, uploadOptions);
    }

    console.log("Upload successful:", result.secure_url);
    return {
      url: result.secure_url,
      public_id: result.public_id,
      asset_id: result.asset_id,
      resource_type: result.resource_type,
      format: result.format,
      duration: result.duration || null, // Video duration if applicable
      width: result.width || null,
      height: result.height || null,
      bytes: result.bytes || null,
    };
  } catch (error) {
    console.error("Cloudinary upload error details:", {
      message: error.message,
      code: error.code,
      http_code: error.http_code,
      name: error.name,
      stack: error.stack,
    });
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Deletes a file from Cloudinary
 * @param {string} public_id - The public ID of the file to delete
 * @param {string} resource_type - The resource type (image, video, raw, auto)
 * @returns {Promise<Object>} - Returns the deletion result
 */
const deleteFile = async (public_id, resource_type = "auto") => {
  try {
    if (!public_id) throw new Error("No public_id provided");

    const deleteOptions = {
      resource_type: resource_type,
    };

    const result = await cloudinary.uploader.destroy(public_id, deleteOptions);
    console.log("File deleted successfully:", public_id);
    return result;
  } catch (error) {
    console.error("Cloudinary deletion error:", error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

/**
 * Deletes multiple files from Cloudinary
 * @param {Array} public_ids - Array of public IDs to delete
 * @param {string} resource_type - The resource type (image, video, raw, auto)
 * @returns {Promise<Object>} - Returns the deletion result
 */
const deleteMultipleFiles = async (public_ids, resource_type = "auto") => {
  try {
    if (!public_ids || !Array.isArray(public_ids) || public_ids.length === 0) {
      throw new Error("No public_ids provided or invalid format");
    }

    const deleteOptions = {
      resource_type: resource_type,
    };

    const result = await cloudinary.api.delete_resources(
      public_ids,
      deleteOptions
    );
    console.log("Multiple files deleted successfully:", public_ids.length);
    return result;
  } catch (error) {
    console.error("Cloudinary multiple deletion error:", error);
    throw new Error(`Failed to delete multiple files: ${error.message}`);
  }
};

module.exports = { uploads, deleteFile, deleteMultipleFiles };
