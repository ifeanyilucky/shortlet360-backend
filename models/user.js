const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone_number: String,
    photo: {
      type: Object,
      default: null,
    },
    business_name: String,
    role: {
      type: String,
      enum: ["user", "owner"],
      default: "user",
    },
    is_verified: { type: Boolean, default: false },
    is_active: { type: Boolean, default: false },
    registration_payment_status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    registration_payment: {
      type: Object,
      default: null,
    },
    host_details: {
      id_document: String,
      verification_status: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
      },
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
      },
    ],
    short_id: {
      type: String,
      unique: true,
      required: true,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.createJWT = function () {
  return jwt.sign(
    { userId: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_LIFETIME }
  );
};

userSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
