const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "Please add your first name"],
      maxLength: [50, "First name cannot be more than 50 characters"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Please add your last name"],
      maxLength: [50, "Last name cannot be more than 50 characters"],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Please provide a phone Number"],
      match: [/^\d{10,15}$/, "Please enter a valid phone number"],
      unique: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Please select your date of birth"],
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
      required: [true, "Please select your gender"],
    },
    identificationType: {
      type: String,
      enum: ["BVN", "NIN"],
      required: [true, "Please select an identification type"],
    },
    idNumber: {
      type: String,
      required: [true, "Please enter your ID number"],
      match: [/^\d{11}$/, "ID number must be 11 digits"],
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minLength: 8,
      match: [
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      ],
      select: false,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

//Encrypt password before saving

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match Password with one saved in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

//Generate and hash password reset token
UserSchema.methods.getResetPasswordToken = function () {
  //Generate Token
  const resetToken = crypto.randomBytes(20).toString("hex");

  //Hash token and store in resetPasswordToken field

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  //Set token expiration time (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model("User", UserSchema);
