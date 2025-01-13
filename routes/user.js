const express = require("express");
const router = express.Router();

const {
  getUserProfile,
  getUsers,
  updateUser,
  deleteUser,

  searchUsers,
} = require("../controllers/users");
const authentication = require("../middlewares/authentication");

router.get("/search", searchUsers);
router.get("/:username", authentication, getUserProfile);
router.get("/", getUsers);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
