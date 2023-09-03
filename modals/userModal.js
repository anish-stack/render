const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  contactNumber: {
    type: String,
  },
  avatar: {
    type: String, // You can store the avatar image URL here
  },
  otp: {
    type: Number,
  },
  otpExpires: Date,
  resetPasswordToken: String,
  resetPasswordTokenExpires: Date,
  activationToken: String,
  activationTokenExpires: Date,
  isActivated: Boolean,
  dateOfJoin: {
    type: Date,
    default: Date.now,
  },
});

// Hash the password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    return next(error);
  }
});

// Add the method to generate a JWT token
userSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_TOKEN, {
    expiresIn: process.env.JWT_Expires,
  });
};

// Add the method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
