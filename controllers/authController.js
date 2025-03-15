const express = require("express");
const router = express.Router();
const User = require("../models/user");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const sendTokenResponse = require("../utils/sendTokenResponse");

// @desc    Register User
// @route   POST /api/v1/auth/register
// @access  Public
router.post("/register", async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth,
      gender,
      identificationType,
      idNumber,
      email,
      password,
    } = req.body;

    // Check if user already exists (by email or phone number)
    let user = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "Email and Phone Number already exists",
      });
    }

    // Create new User (Mongoose will perform validations)
    user = await User.create({
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth,
      gender,
      identificationType,
      idNumber,
      email,
      password,
    });

    // Send token response on successful registration
    sendTokenResponse(user, 201, res);
  } catch (error) {
    // If it's a Mongoose validation error, format errors per field
    if (error.name === "ValidationError") {
      const errors = {};
      Object.keys(error.errors).forEach((field) => {
        errors[field] = error.errors[field].message;
      });
      return res.status(400).json({ success: false, errors });
    }
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
});

// @desc    Login User
// @route   POST /api/v1/auth/login
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email and password",
      });
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = user.getSignedJwtToken();

    // Set token as HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    });

    // Send response
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
});

// @desc Get Logged-In User Profile
// @route GET /api/v1/auth/user
// @access Private
router.get("/user", async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
});

// @desc Update user profile
// @route PUT /api/v1/auth/update-profile
// @access Private
router.put("/update-profile", async (req, res) => {
  try {
    const updates = req.body;

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Profile updated successfully", user });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
});

// @desc Forgot Password (Generate reset token)
// @route POST /api/v1/auth/forgot-password
// @access Public
router.post("/forgot-password", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found" });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL (Later Will Replace with Frontend URL)
    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/auth/reset-password/${resetToken}`;

    res.status(200).json({
      success: true,
      message: "Password reset link has been sent",
      resetUrl,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
});

// @desc Reset Password
// @route PUT /api/v1/auth/reset-password/:resetToken
// @access Public
router.put("/reset-password/:resetToken", async (req, res) => {
  try {
    // Hash token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resetToken)
      .digest("hex");

    // Find user by reset token and check if token is not expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid reset token" });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
});

// @desc Update Password while logged in
// @route PUT /api/v1/auth/update-password
// @access Private
router.put("/update-password", async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("+password");

    if (!user || !(await user.matchPassword(req.body.currentPassword))) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect Current Password" });
    }

    // Update Password
    user.password = req.body.newPassword;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
});

// @desc Get all users
// @route GET /api/v1/auth/users
// @access Private (Admin Only)
router.get("/users", async (req, res) => {
  try {
    // Fetch all users, excluding passwords
    const users = await User.find().select("-password");

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
});

// @desc    Logout User
// @route   POST /api/v1/auth/logout
// @access  Private
router.post("/logout", async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

module.exports = router;
