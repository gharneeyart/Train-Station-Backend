// routes/paymentRoutes.js
const express = require("express");
const {
  initializePayment,
  verifyPayment,
} = require("../controllers/paymentController");

const router = express.Router();

// POST /api/v1/payments/initialize
router.post("/initialize", initializePayment);

// GET /api/v1/payments/verify/:ref (optional, if using manual verification)
router.get("/verify/:ref", verifyPayment);

module.exports = router;
