// In controllers/ticketController.js
const Booking = require("../models/booking");
const { sendTickets } = require("../utils/emailService"); // Use destructuring

exports.getAllConfirmedTickets = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await Booking.find({
      user: userId,
      status: "confirmed",
    })
      .populate("train")
      .populate("user");

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching confirmed bookings:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTicketByBookingId = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findOne({ bookingId })
      .populate("train")
      .populate("user");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(booking);
  } catch (error) {
    console.error("Error fetching ticket:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.resendTicketEmails = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findOne({ bookingId })
      .populate("train")
      .populate("user");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    await sendTickets(booking, booking.contact);

    res.json({ message: "Ticket emails re-sent successfully" });
  } catch (error) {
    console.error("Error re-sending ticket emails:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.cancelTicket = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to cancel this booking" });
    }

    // Update booking status to cancelled
    booking.status = "cancelled";
    await booking.save();

    // Refund logic would go here if implemented

    res.json({ message: "Ticket cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling ticket:", error);
    res.status(500).json({ message: "Server error" });
  }
};
