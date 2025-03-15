require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const Payment = require("./models/payment");
const Booking = require("./models/booking");
const Train = require("./models/train");
const { sendTickets } = require("./utils/emailService");

// Routers
const authRouter = require("./routes/authRoutes");
const trainRouter = require("./routes/trainRoutes");
const bookingRouter = require("./routes/bookingRoutes");
const paymentRouter = require("./routes/paymentRoutes");
const ticketRouter = require("./routes/ticketRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  optionsSuccessStatus: 200,
};

// Middleware
app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// Authentication middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/trains", verifyToken, trainRouter);
app.use("/api/v1/bookings", verifyToken, bookingRouter);
app.use("/api/v1/payments", verifyToken, paymentRouter);
app.use("/api/v1/ticket", verifyToken, ticketRouter);

// User profile endpoint
app.get("/api/v1/auth/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Payment callback route
app.get("/payment-callback", async (req, res) => {
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
    res.status(500).send("Payment processing encountered an error");
  }
});

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
