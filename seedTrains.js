require("dotenv").config();
const mongoose = require("mongoose");
const Train = require("./models/train"); // Fixed import
const trainSchedules = require("./trainSchedules"); // Fixed import

const seedTrains = async () => {
  try {
    console.log("Seeding train schedules.....");

    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await Train.deleteMany({});
    console.log("Old train database documents removed");

    await Train.insertMany(trainSchedules);
    console.log("New train schedules inserted successfully");
  } catch (error) {
    console.error("Seeding error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
    process.exit(0);
  }
};

seedTrains();
