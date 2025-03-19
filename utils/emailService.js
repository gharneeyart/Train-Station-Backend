const nodemailer = require("nodemailer");
const hbs = require("handlebars");
const fs = require("fs");
const path = require("path");

// Configure transporter using Gmail shorthand
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper function to compile Handlebars templates
const compileTemplate = (templatePath, context) => {
  const template = fs.readFileSync(templatePath, "utf8");
  const compiledTemplate = hbs.compile(template);
  return compiledTemplate(context);
};

// Send tickets to passengers
exports.sendTickets = async (booking, contact) => {
  try {
    // Check if train and departure/arrival information exist
    if (!booking.train || !booking.train.departure || !booking.train.arrival) {
      console.error(
        "Missing train departure or arrival information in booking"
      );
      return;
    }

    // Send individual tickets to each passenger
    for (const [index, passenger] of booking.passengers.entries()) {
      const context = {
        departureTime: booking.train.departure.time,
        departureStation: booking.train.departure.station,
        departureDate: booking.train.departure.date,
        arrivalTime: booking.train.arrival.time,
        arrivalStation: booking.train.arrival.station,
        arrivalDate: booking.train.arrival.date,
        trainNumber: booking.train.trainNumber,
        coachNumber: booking.coach,
        seatNumber: booking.seats[index],
        passengerType: passenger.type,
        bookingId: booking.bookingId,
        bookingDate: booking.createdAt.toLocaleDateString(),
        passengerName: passenger.name,
        passengerNIN: passenger.nin,
        passengerEmail: passenger.email,
        passengerPhone: passenger.phone,
      };

      // Check if all required context properties exist
      for (const key in context) {
        if (context[key] === undefined) {
          console.error(`Missing required property in email context: ${key}`);
          return;
        }
      }

      const html = compileTemplate(
        path.resolve("./views/ticket.handlebars"),
        context
      );

      const mailOptions = {
        from: "NRC Bookings <aduragbemishobowale10@gmail.com>",
        to: passenger.email,
        subject: "Your Nigerian Railway Corporation Ticket",
        html: html,
      };

      await transporter.sendMail(mailOptions);
    }

    // Send summary to contact email
    const summaryContext = {
      bookingId: booking.bookingId,
      passengers: booking.passengers.map((passenger, index) => ({
        name: passenger.name,
        seat: booking.seats[index],
        type: passenger.type,
      })),
      contactEmail: contact.email,
      contactPhone: contact.phone,
      totalAmount: booking.totalPrice,
    };

    // Check if all required summary context properties exist
    for (const key in summaryContext) {
      if (summaryContext[key] === undefined) {
        console.error(
          `Missing required property in summary email context: ${key}`
        );
        return;
      }
    }

    const summaryHtml = compileTemplate(
      path.resolve("./views/bookingSummary.handlebars"),
      summaryContext
    );

    const summaryOptions = {
      from: "NRC Bookings <aduragbemishobowale10@gmail.com>",
      to: contact.email,
      subject: "Summary of Your Nigerian Railway Corporation Booking",
      html: summaryHtml,
    };

    await transporter.sendMail(summaryOptions);
  } catch (error) {
    console.error("Error sending emails:", error);
    throw error;
  }
};
// Send password reset email
exports.sendPasswordResetEmail = async (user, resetToken, resetUrl) => {
  try {
    const context = {
      user: user,
      resetUrl: resetUrl,
    };

    const html = compileTemplate(
      path.resolve("./views/resetPasswordEmail.handlebars"),
      context
    );

    const mailOptions = {
      from: "NRC Bookings <aduragbemishobowale10@gmail.com>",
      to: user.email,
      subject: "Password Reset Request",
      html: html,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};
