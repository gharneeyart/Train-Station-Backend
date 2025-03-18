// paymentController.js
const mongoose = require("mongoose");
const axios = require("axios");
const crypto = require("crypto");
const Payment = require("../models/payment");
const Booking = require("../models/booking");
const Train = require("../models/train");
const { sendTickets } = require("../utils/emailService");

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
      callback_url: `${process.env.FRONTEND_URL}/payment-success`,
      metadata: {
        webhook_url: `${process.env.BACKEND_URL}/api/v1/payments/webhook`,
      },
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

    payment.status = "successful";
    await payment.save();

    const booking = await Booking.findById(payment.booking).populate("train");
    if (booking) {
      booking.status = "confirmed";
      await booking.save();
      await sendTickets(booking, booking.contact);
    }

    res.status(200).json({ message: "Payment verified successfully" });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      message: "Payment verification failed",
      error: error.message,
    });
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const event = req.body.event;
    const data = req.body.data;

    if (event === "charge.success") {
      const reference = data.reference;
      // Verify payment using the reference
      const paymentVerification = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      if (
        paymentVerification.data.status &&
        paymentVerification.data.data.status === "success"
      ) {
        const payment = await Payment.findOne({ reference });
        if (payment) {
          payment.status = "successful";
          await payment.save();

          const booking = await Booking.findById(payment.booking);
          if (booking) {
            booking.status = "confirmed";
            await booking.save();
            await sendTickets(booking, booking.contact);
          }
        }
      }
    }

    res.status(200).send("Webhook received");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Webhook processing failed");
  }
};
