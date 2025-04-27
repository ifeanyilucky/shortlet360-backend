const express = require("express");
const router = express.Router();
const {
  addToFavorites,
  removeFromFavorites,
  getFavorites,
} = require("../controllers/favoriteController");
const auth = require("../middlewares/authentication");

router.use(auth);

router.post("/", addToFavorites);
router.delete("/:propertyId", removeFromFavorites);
router.get("/", getFavorites);

module.exports = router;
