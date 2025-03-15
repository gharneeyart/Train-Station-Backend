const User = require("../models/user");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const sendTokenResponse = require("../utils/sendTokenResponse");

// @desc Register User
// @route POST /api/v1/auth/register
// @access Public

exports.registerUser = async (req, res, next) => {
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

    //Check if user already exists
    let user = await User.findOne({ email }, { phoneNumber });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "Email and Phone Number already exists",
      });
    }

    //Create new User
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

    //Send token response
    sendTokenResponse(user, 201, res);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc Login User
// @route POST /api/v1/auth/login
// @access Public

exports.loginUser = async (req, res) => {
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

    //Send token response
    sendTokenResponse(user, 200, res);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc Get Logged-In User Profile
// @route GET /api/v1/auth/user
// @access Private

exports.getUserProfile = async (req, res) => {
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
};

// @desc Update user profile
// @route PUT /api/v1/auth/update-profile
// @access Private

exports.updateUserProfile = async (req, res) => {
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
};

// @desc Forgot Password (Generate reset token)
// @route POST /api/v1/auth/forgot-password
// @access Public

exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found" });
    }

    //Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    //Create reset URL (Later Will Repalce with Frontend URL)
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
};

// @desc Reset Password
// @route PUT /api/v1/auth/reset-password/resetToken
// @access Public

exports.resetPassword = async (req, res) => {
  try {
    //Hash token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resetToken)
      .digest("hex");

    //Find user by reset token and check if token is not expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    //Set new password
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
};

// @desc Update Password while logged in
// @route PUT /api/v1/auth/update-password
// @access Private



exports.updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("+password");

    if (!user || !(await user.matchPassword(req.body.currentPassword))) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect Current Password" });
    }

    //Update Password
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
};

// @desc Get all users
// @route GET /api/v1/auth/users
// @access Private (Admin Only)

exports.getAllUsers = async (req, res) => {
  try {
    //Fetch all users, excluding passwords
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
};
