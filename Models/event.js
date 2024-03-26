const mongoose = require("mongoose");
const eventSchema = new mongoose.Schema(
  {
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
    buyers: {
      type: Array,
    },
    interestedUsers: {
      type: Array,
    },
    goingUsers: {
      type: Array,
    },
    attendees: {
      type: Array,
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
    organizers: {
      type: Array,
    },
    staff: {
      type: Array,
    },
    venue: {
      type: Object,
    },
    createdBy: {
      type: Object,
    },
    creatorId: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("event", eventSchema);
