// paymentRoutes.js
const express = require("express");
const {
  initializePayment,
  verifyPayment,
  handleWebhook,
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/initialize", initializePayment);
router.get("/verify/:ref", verifyPayment);
router.post("/webhook", handleWebhook);

module.exports = router;
