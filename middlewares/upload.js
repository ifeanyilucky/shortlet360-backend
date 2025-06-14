const multer = require("multer");
const { uploads } = require("../utils/cloudinary");

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Document upload configuration for KYC (5MB limit)
const documentUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for documents
  },
  fileFilter: (req, file, cb) => {
    // Check if file is a document (PDF, JPG, JPEG, PNG)
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg", 
      "image/png"
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, JPEG, and PNG files are allowed"), false);
    }
  },
});

// Middleware to handle file upload and Cloudinary upload
const uploadToCloudinary = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    // Convert buffer to base64
    const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    // Upload to cloudinary
    const uploadedFile = await uploads(fileStr, "aplet360/kyc-documents");

    // Add cloudinary response to req.file
    req.file.path = uploadedFile.url;
    req.file.filename = uploadedFile.public_id;
    req.file.asset_id = uploadedFile.asset_id;
    req.file.format = uploadedFile.format;

    next();
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({
      success: false,
      message: "File upload failed",
      error: error.message,
    });
  }
};

// Combined middleware for single file upload
const single = (fieldName) => {
  return [
    documentUpload.single(fieldName),
    uploadToCloudinary
  ];
};

// Combined middleware for multiple file upload
const array = (fieldName, maxCount = 5) => {
  return [
    documentUpload.array(fieldName, maxCount),
    async (req, res, next) => {
      try {
        if (!req.files || req.files.length === 0) {
          return next();
        }

        // Upload all files to cloudinary
        const uploadPromises = req.files.map(async (file) => {
          const fileStr = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
          const uploadedFile = await uploads(fileStr, "aplet360/kyc-documents");
          
          // Add cloudinary response to file object
          file.path = uploadedFile.url;
          file.filename = uploadedFile.public_id;
          file.asset_id = uploadedFile.asset_id;
          file.format = uploadedFile.format;
          
          return file;
        });

        await Promise.all(uploadPromises);
        next();
      } catch (error) {
        console.error("Cloudinary upload error:", error);
        res.status(500).json({
          success: false,
          message: "File upload failed",
          error: error.message,
        });
      }
    }
  ];
};

module.exports = {
  single,
  array,
  documentUpload,
  uploadToCloudinary,
};
