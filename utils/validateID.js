const mongoose = require("mongoose");

const validateID = (id) => {
  const isValid = mongoose.Types.ObjectId.isValid(id);
  return isValid;
};

module.exports = validateID;
