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
    mapSnap: {
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
      type: {
        type: String,
        enum: ["Point"], // Only "Point" type is allowed
        required: true,
      },
      coordinates: {
        type: [Number], // Array of two numbers: [longitude, latitude]
        required: true,
      },
    },
    followers: {
      type: Array,
    },
    activeEvents: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);
venueSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("venue", venueSchema);
