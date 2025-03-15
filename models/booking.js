const mongoose = require("mongoose");

const PassengerSchema = new mongoose.Schema({
  type: { type: String, required: true }, // "Adult" or "Child"
  name: { type: String, required: true },
  nin: {
    type: String,
    required: true,
    match: [/^\d{11}$/, "NIN must be exactly 11 digits"],
  },
  email: {
    type: String,
    required: true,
    match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
  },
  phone: { type: String, required: true },
});

const BookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  train: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Train",
    required: true,
  },
  classType: { type: String, required: true },
  coach: { type: String, required: true },
  seats: [{ type: Number, required: true }],
  passengers: [PassengerSchema],
  contact: {
    email: {
      type: String,
      required: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    phone: { type: String, required: true },
  },
  totalPrice: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  bookingId: {
    type: String,
    unique: true,
  },
});

// Generate custom booking ID before saving
BookingSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  let bookingId;
  const prefix = "NRC";

  do {
    bookingId = prefix + Math.floor(10000000 + Math.random() * 90000000);
    const exists = await this.constructor.exists({ bookingId });
    if (!exists) break;
  } while (true);

  this.bookingId = bookingId;
  next();
});

module.exports = mongoose.model("Booking", BookingSchema);
