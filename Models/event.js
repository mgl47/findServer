const mongoose = require("mongoose");
const eventSchema = new mongoose.Schema({
  uuid: {
    type: String,
  },
  valid: {
    type: Boolean,
  },
  title: {
    type: String,
  },
  description: {
    type: String,
  },
  tickets: {
    type: Array,
  },
  artists: {
    type: Array,
  },
  interested: {
    type: Number,
  },
  going: {
    type: Number,
  },
  category: {
    type: String,
  },
  dates: {
    type: Array,
  },
  videos: {
    type: Array,
  },
  photos: {
    type: Array,
  },
  promoters: {
    type: Array,
  },
  createdBy: {
    type: Object,
  },
});

module.exports = mongoose.model("event", eventSchema);
