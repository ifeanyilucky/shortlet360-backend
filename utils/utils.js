const Property = require("../models/property");
const User = require("../models/user");

// Generate a short ID for properties
const generateShortPropertyId = async () => {
  // Generate a 6-digit number
  const generateNumber = () => Math.floor(100000 + Math.random() * 900000);
  let shortId;
  let isUnique = false;

  // Keep trying until we get a unique ID
  while (!isUnique) {
    shortId = `AP-${generateNumber()}`;
    // Check if this ID already exists
    const existingProperty = await Property.findOne({ short_id: shortId });
    if (!existingProperty) {
      isUnique = true;
    }
  }

  return shortId;
};

// Generate a short ID for users based on their role
const generateShortUserId = async (role) => {
  // Generate a 6-digit number
  const generateNumber = () => Math.floor(100000 + Math.random() * 900000);
  let shortId;
  let isUnique = false;

  // Prefix based on user role
  const prefix = role === "owner" ? "OW-" : "US-";

  // Keep trying until we get a unique ID
  while (!isUnique) {
    shortId = `${prefix}${generateNumber()}`;
    // Check if this ID already exists
    const existingUser = await User.findOne({ short_id: shortId });
    if (!existingUser) {
      isUnique = true;
    }
  }

  return shortId;
};

module.exports = {
  generateShortPropertyId,
  generateShortUserId
};
