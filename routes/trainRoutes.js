const express = require("express");
const {
  getAllTrains,
  getTrainById,
  searchTrains,
  createTrain,
  deleteTrain,
  updateTrain,
  getAvailableDates,
} = require("../controllers/trainController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", getAllTrains);
router.get("/:id", getTrainById);
router.get("/available-dates", getAvailableDates);
router.post("/search", protect, searchTrains);

router.post("/", protect, createTrain);
router.put("/:id", protect, updateTrain);
router.delete("/:id", protect, deleteTrain);

module.exports = router;
