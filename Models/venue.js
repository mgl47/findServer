const mongoose = require("mongoose");

const venueSchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
    },
    displayName: {
      type: String,
    },
    description: {
      type: String,
    },
    createdBy: {
      type: String,
    },
    phone: {
      type: Array,
    },
    photos: {
      type: Array,
    },
    address: {
      type: Object,
    },
    location: {
      type: Object,
    },
    followers: {
      type: Array,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("venue", venueSchema);
