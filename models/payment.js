// models/Payment.js
const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
  },
  reference: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "successful", "failed"],
    default: "pending",
  },
  paymentDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", PaymentSchema);
