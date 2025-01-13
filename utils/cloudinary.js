const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure cloudinary with environment variables
cloudinary.config({
  cloud_name: "duvwweuhj",
  api_key: "823768151355777",
  api_secret: "-af_qO_IlW8EvyMlgkFRAgfVgkA"
});

// Validate configuration
const validateConfig = () => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error('Missing Cloudinary configuration. Please check your environment variables.');
  }
  console.log('Cloudinary configured successfully');
};

// Call validation on startup
validateConfig();

/**
 * Uploads a file to Cloudinary
 * @param {string} file - The file path or base64 string
 * @param {string} folder - The destination folder in Cloudinary
 * @returns {Promise<Object>} - Returns the upload result
 */
const uploads = async (file, folder) => {
  try {
    // Input validation
    if (!file) throw new Error('No file provided');
    if (!folder) throw new Error('No folder specified');

    console.log('Attempting to upload file to folder:', folder);

    const uploadOptions = {
      folder,
      resource_type: "auto",
      quality: "auto",
      fetch_format: "auto",
    };

    const result = await cloudinary.uploader.upload(file, uploadOptions);

    console.log('Upload successful:', result.secure_url);
    return {
      url: result.secure_url,
      public_id: result.public_id,
      asset_id: result.asset_id
    };

  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Deletes a file from Cloudinary
 * @param {string} public_id - The public ID of the file to delete
 * @returns {Promise<Object>} - Returns the deletion result
 */
const deleteFile = async (public_id) => {
  try {
    if (!public_id) throw new Error('No public_id provided');

    const result = await cloudinary.uploader.destroy(public_id);
    console.log('File deleted successfully:', public_id);
    return result;
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

module.exports = { uploads, deleteFile };

