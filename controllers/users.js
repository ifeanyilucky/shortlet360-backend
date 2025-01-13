const User = require("../models/user");
const { StatusCodes } = require("http-status-codes");

// exports.getUserProfile = async (req, res) => {
//   const { username } = req.params;
//   const user = await User.findOne({ username }).select("-password");

//   res.status(StatusCodes.OK).json({ user });
// };
exports.getUserProfile = async (req, res) => {
  console.log("current user", req.user);
  const { username } = req.params;
  const currentUserId = req.user._id; // From auth middleware

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const currentUser = await User.findById(currentUserId);
  const isSubscribed = await currentUser.isSubscribedTo(user._id);

  // Remove sensitive information
  const userProfile = {
    ...user.toObject(),
    password: undefined,
    isSubscribed,
  };

  res.status(200).json({ user: userProfile });
};

exports.getUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.status(StatusCodes.OK).json({ users });
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, bio, avatar } = req.body;
  const user = await User.findByIdAndUpdate(id, { name, bio, avatar });
  res.status(StatusCodes.OK).json({ user });
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  await User.findByIdAndDelete(id);
  res.status(StatusCodes.NO_CONTENT).send();
};

exports.getUserPosts = async (req, res) => {
  const { username } = req.params;
  const posts = await Post.find({ creator: username });
  res.status(StatusCodes.OK).json({ posts });
};

exports.getUserFollowers = async (req, res) => {
  const { username } = req.params;
  const followers = await User.find({ following: username }).select(
    "-password"
  );
  res.status(StatusCodes.OK).json({ followers });
};

exports.getUserFollowing = async (req, res) => {
  const { username } = req.params;
  const following = await User.find({ followers: username }).select(
    "-password"
  );
  res.status(StatusCodes.OK).json({ following });
};

exports.getRecommendedUsers = async (req, res) => {
  const recommendedUsers = await User.aggregate([
    { $match: { _id: { $ne: req.user._id } } },
    { $project: { password: 0 } },
    { $sample: { size: 3 } },
  ]);
  res.status(StatusCodes.OK).json({ recommendedUsers });
};

exports.searchUsers = async (req, res) => {
  const { q } = req.query;

  const users = await User.find({
    username: { $regex: q.trim(), $options: "i" },
  })
    .limit(5)
    .select("username avatar");
  console.log("users", users);

  // If no users found, return empty array instead of null
  if (!users || users.length === 0) {
    return res.status(StatusCodes.OK).json({ users: [] });
  }

  res.status(StatusCodes.OK).json({ users });
};
