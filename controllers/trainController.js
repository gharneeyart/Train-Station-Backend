const Train = require("../models/train");

/**
 * @desc Get all trains
 * @route Get /api/v1/trains
 * @access Public
 */
exports.getAllTrains = async (req, res) => {
  try {
    const trains = await Train.find().populate("classes");
    res.status(200).json(trains);
  } catch (error) {
    console.error("Error fetching trains:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc Get a single train by ID
// @route Get  /api/v1/trains/:id
// @access Public

exports.getTrainById = async (req, res, next) => {
  try {
    const train = await Train.findById(req.params.id);
    if (!train) {
      return res.status(404).json({ message: "Train not found" });
    }
    res.status(200).json(train);
  } catch (error) {
    console.error("Error fetching trains:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc Create a new train
// @route POST /api/v1/trains
// @access Private (Admin)

exports.createTrain = async (req, res) => {
  try {
    const newTrain = new Train(req.body);
    await newTrain.save();
  } catch (error) {
    console.error("Error fetching trains:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc Update a train
// @route PUT /api/v1/trains/:id
// @access Private

exports.updateTrain = async (req, res) => {
  try {
    const updateTrain = await Train.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updateTrain) {
      return res.status(404).json({ message: "Train not found" });
    }
    res.status(200).json(updateTrain);
  } catch (error) {
    console.error("Error fetching trains:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc Delete a train
// @route DELETE /api/v1/trains/:id
// @access Private

exports.deleteTrain = async (req, res) => {
  try {
    const deletedTrain = await Train.findByIdAndDelete(req.params.id);
    if (!deletedTrain) {
      return res.status(404).json({ message: "Train not found" });
    }
    res.status(200).json({ message: "Train deleted successfully" });
  } catch (error) {
    console.error("Error deleting train:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc Search trains by departure, arrival, and date
// @route POST /api/v1/trains/search
// @access Public

exports.searchTrains = async (req, res) => {
  try {
    const { fromStation, toStation, date } = req.body;
    if (!fromStation || !toStation || !date) {
      return res
        .status(400)
        .json({ message: "Please provide fromStation, toStation, and date." });
    }

    const filter = {
      "departure.station": fromStation,
      "arrival.station": toStation,
      "departure.date": date,
    };

    const trains = await Train.find(filter);
    if (!trains.length) {
      return res.status(404).json({ message: "No trains found" });
    }
    res.status(200).json(trains);
  } catch (error) {
    console.error("Error deleting train:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
