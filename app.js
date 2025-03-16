require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const cookieParser = require("cookie-parser");

const Payment = require("./models/payment");
const Booking = require("./models/booking");
const Train = require("./models/train");
const { sendTickets } = require("./utils/emailService");
const errorHandler = require("./middlewares/erroHandler");

// Routers (adjust paths as necessary)
const authRouter = require("./routes/authRoutes");
const trainRouter = require("./routes/trainRoutes");
const bookingRouter = require("./routes/bookingRoutes");
const paymentRouter = require("./routes/paymentRoutes");
const ticketRouter = require("./routes/ticketRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  "http://localhost:5173", 
  "https://train-station-one.vercel.app"
];

app.use(
  cors({
    origin: allowedOrigins,        // or use a function for dynamic checks
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,             // if you need cookies, set to true
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/trains", trainRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/ticket", ticketRouter);

// Payment callback route
app.get("/payment-callback", async (req, res, next) => {
  try {
    const { reference } = req.query;
    if (!reference) {
      return res.status(400).send("Invalid payment callback");
    }

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

    const payment = await Payment.findOne({ reference: reference });
    if (!payment) {
      return res.status(404).send("Payment record not found");
    }

    payment.status = "successful";
    await payment.save();

    const booking = await Booking.findById(payment.booking);
    if (booking) {
      booking.status = "confirmed";
      await booking.save();
      await sendTickets(booking, booking.contact);
    }

    res.redirect(
      `${process.env.FRONTEND_URL}/payment-success?bookingId=${booking.bookingId}`
    );
  } catch (error) {
    next(error); // ✅ Pass errors to error handler
  }
});

// ✅ Error-handling middleware (must be placed after all routes)
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
