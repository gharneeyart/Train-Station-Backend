// app.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const cookieParser = require("cookie-parser");
const colors = require("colors");

const Payment = require("./models/payment");
const Booking = require("./models/booking");
const { sendTickets } = require("./utils/emailService");
const errorHandler = require("./middlewares/erroHandler");

// Routers
const authRouter = require("./routes/authRoutes");
const trainRouter = require("./routes/trainRoutes");
const bookingRouter = require("./routes/bookingRoutes");
const paymentRouter = require("./routes/paymentRoutes");
const ticketRouter = require("./routes/ticketRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup
const allowedOrigins = [
  "http://localhost:3000",
  "https://nrc-gray.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Example template engine settings
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// Register routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/trains", trainRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/ticket", ticketRouter);

/**
 * Paystack callback route
 * After successful payment, Paystack redirects here with ?reference=xxx
 */
app.get("/payment-callback", async (req, res, next) => {
  try {
    const { reference } = req.query;
    if (!reference) {
      return res.status(400).send("Invalid payment callback: No reference");
    }

    // Verify the payment with Paystack
    const paymentVerification = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
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
      return res.status(402).send("Payment verification failed");
    }

    // Find the payment record
    const payment = await Payment.findOne({ reference });
    if (!payment) {
      return res.status(404).send("Payment record not found");
    }

    // Mark payment as successful
    payment.status = "successful";
    await payment.save();

    // Update the booking with population to get train details
    const booking = await Booking.findById(payment.booking)
      .populate("train") // Ensure we get train details
      .exec();

    if (!booking) {
      return res.status(404).send("Booking not found");
    }

    // Check if train information is complete
    if (!booking.train || !booking.train.departure || !booking.train.arrival) {
      console.error(
        "Booking is missing train departure or arrival information"
      );
      return res
        .status(500)
        .send("Failed to process payment - missing train information");
    }

    booking.status = "confirmed";
    await booking.save();

    // Function to send tickets with retry logic
    async function sendTicketsWithRetry(booking, contact) {
      const maxRetries = 2;
      let delay = 5000; // Initial delay of 5 seconds

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          await sendTickets(booking, contact);
          console.log(`Tickets sent successfully on attempt ${attempt + 1}`);
          return true;
        } catch (error) {
          console.error(`Email sending attempt ${attempt + 1} failed:`, error);
          
          if (attempt === maxRetries - 1) {
            throw error; // Re-throw after final attempt
          }
          
          // Wait before next attempt with exponential backoff
          console.log(`Waiting ${delay}ms before next attempt`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Double the delay for next attempt
        }
      }
    }

    // Send email with tickets
    try {
      await sendTicketsWithRetry(booking, booking.contact);
    } catch (emailError) {
      console.error("All email sending attempts failed:", emailError);
      // Consider implementing alerting or logging for monitoring
    }

    // Redirect to the ticket page on the frontend
    return res.redirect(`${process.env.FRONTEND_URL}/ticket`);
  } catch (error) {
    console.error("Payment callback error:", error);
    next(error);
  }
});

// Error-handling middleware
app.use(errorHandler);

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Database Connected Successfully".bgGreen.bold);
    app.listen(PORT, () => {
      console.log(`Server is running on PORT ${PORT}`.bgYellow.bold);
    });
  } catch (error) {
    console.error("Database connection failed", error);
  }
};

start();
