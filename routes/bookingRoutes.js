const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const {
  createBooking,
  getBookingById,
  getUserConfirmedBookings,
  getAllUserBookings,
} = require("../controllers/bookingController");

const router = express.Router();

// Get all user booking
router.get("/", protect, getAllUserBookings);

// Get all confirmed bookings for the user
router.get("/confirmed", protect, getUserConfirmedBookings);

// Create a new booking
router.post("/", protect, createBooking);

// Get booking by ID
router.get("/:id", protect, getBookingById);

module.exports = router;
