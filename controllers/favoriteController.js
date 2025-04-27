const User = require("../models/user");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");

const addToFavorites = async (req, res) => {
  const { propertyId } = req.body;
  const userId = req.user._id;

  if (!propertyId) {
    throw new BadRequestError("Property ID is required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Check if property is already in favorites
  if (user.favorites.includes(propertyId)) {
    throw new BadRequestError("Property already in favorites");
  }

  // Add to favorites
  user.favorites.push(propertyId);
  await user.save();

  res.status(StatusCodes.OK).json({ message: "Added to favorites" });
};

const removeFromFavorites = async (req, res) => {
  const { propertyId } = req.params;
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Remove from favorites
  user.favorites = user.favorites.filter((id) => id.toString() !== propertyId);
  await user.save();

  res.status(StatusCodes.OK).json({ message: "Removed from favorites" });
};

const getFavorites = async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).populate({
    path: "favorites",
    select:
      "property_name property_images location pricing bedroom_count bathroom_count max_guests owner",
    populate: {
      path: "owner",
      select: "first_name last_name",
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  res.status(StatusCodes.OK).json({ favorites: user.favorites });
};

module.exports = {
  addToFavorites,
  removeFromFavorites,
  getFavorites,
};
