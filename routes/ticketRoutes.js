// routes/ticketRoutes.js
const express = require("express");
const {
  getAllConfirmedTickets,
  getTicketByBookingId,
  resendTicketEmails,
  cancelTicket,
} = require("../controllers/ticketController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// Get all confirmed tickets for the user
router.get("/", protect, getAllConfirmedTickets);

// Get ticket by booking ID
router.get("/:bookingId", protect, getTicketByBookingId);

// Re-send ticket emails
router.post("/resend-email", protect, resendTicketEmails);

// Cancel ticket
router.delete("/:bookingId", protect, cancelTicket);

module.exports = router;
