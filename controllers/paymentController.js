const mongoose = require("mongoose");
const axios = require("axios");
const crypto = require("crypto");
const Payment = require("../models/payment");
const Booking = require("../models/booking");
const Train = require("../models/train");
const { sendTickets } = require("../utils/emailService");

/**
 * Initialize payment with Paystack.
 */
exports.initializePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const newPayment = new Payment({
      booking: bookingId,
      amount: booking.totalPrice,
      reference: crypto.randomBytes(20).toString("hex"),
    });

    await newPayment.save();

    const requestData = {
      email: booking.contact.email,
      amount: booking.totalPrice * 100, // Convert to kobo
      reference: newPayment.reference,
      callback_url: `${process.env.FRONTEND_URL}/payment-callback`,
    };

    const options = {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      requestData,
      options
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Payment initialization error:", error);
    res.status(500).json({ message: "Payment initialization failed" });
  }
};

/**
 * Verify payment with Paystack.
 * - Updates the payment status and sets booking status to confirmed.
 * - Does not update reservedSeats again.
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { ref } = req.params;
    if (!ref) {
      return res.status(400).json({ message: "No reference provided" });
    }

    const paymentVerification = await axios.get(
      `https://api.paystack.co/transaction/verify/${ref}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (
      !paymentVerification.data.status ||
      paymentVerification.data.data.status !== "success"
    ) {
      return res.status(402).json({
        message: "Payment verification failed",
        error: paymentVerification.data.message,
      });
    }

    const payment = await Payment.findOne({ reference: ref });
    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update payment record
      payment.status = "successful";
      await payment.save({ session });

      // Update booking status to confirmed (without changing reservedSeats)
      const booking = await Booking.findById(payment.booking).populate("train");
      if (!booking) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: "Booking not found" });
      }

      booking.status = "confirmed";
      if (!booking.bookingId) {
        const prefix = "NRC";
        let bookingId;
        do {
          bookingId = prefix + Math.floor(10000000 + Math.random() * 90000000);
          const exists = await Booking.exists({ bookingId });
          if (!exists) break;
        } while (true);
        booking.bookingId = bookingId;
      }
      await booking.save({ session });
      await session.commitTransaction();
      session.endSession();

      // Optionally, send tickets via email
      try {
        await sendTickets(booking, booking.contact);
      } catch (error) {
        console.error("Error sending tickets:", error);
      }

      return res.status(200).json({
        message: "Payment verified successfully",
        payment: paymentVerification.data,
        bookingId: booking.bookingId,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(500)
        .json({ message: "Payment verification failed", error: error.message });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Payment verification failed", error: error.message });
  }
};
