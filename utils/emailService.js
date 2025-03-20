const nodemailer = require("nodemailer");
const hbs = require("handlebars");
const fs = require("fs");
const path = require("path");

// Configure transporter with pooling for better performance
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true, // Enable pooling for multiple emails
});

// Helper function to compile Handlebars templates with error handling
const compileTemplate = (templateName, context) => {
  try {
    const templatePath = path.resolve(`./views/${templateName}.handlebars`);
    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = hbs.compile(templateSource);
    return template(context);
  } catch (error) {
    console.error(`Error compiling template ${templateName}:`, error);
    throw new Error(`Template compilation failed: ${error.message}`);
  }
};

// Centralized email sending function
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `"NRC Bookings" <${process.env.EMAIL_USER || "noreply@nrc.com"}>`,
      ...options,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${options.to} - ${options.subject}`);
  } catch (error) {
    console.error("Error sending email:", error);
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

    const html = compileTemplate("resetPasswordEmail", context);

    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html: html,
    });

    console.log(`Password reset email sent to ${user.email}`);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

// Send tickets to passengers
exports.sendTickets = async (booking, contact) => {
  try {
    // Check if train and departure/arrival information exist
    if (!booking.train || !booking.train.departure || !booking.train.arrival) {
      throw new Error("Missing train departure or arrival information");
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

      // Validate context
      Object.values(context).forEach((value) => {
        if (value === undefined) {
          throw new Error("Missing required property in email context");
        }
      });

      const html = compileTemplate("ticket", context);

      await sendEmail({
        to: passenger.email,
        subject: "Your Nigerian Railway Corporation Ticket",
        html: html,
      });
    }

    // Send booking summary to contact email
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

    // Validate summary context
    Object.values(summaryContext).forEach((value) => {
      if (value === undefined) {
        throw new Error("Missing required property in summary email context");
      }
    });

    const summaryHtml = compileTemplate("bookingSummary", summaryContext);

    await sendEmail({
      to: contact.email,
      subject: "Summary of Your Nigerian Railway Corporation Booking",
      html: summaryHtml,
    });
  } catch (error) {
    console.error("Error sending ticket emails:", error);
    throw error;
  }
};
