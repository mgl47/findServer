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
    haltedSales: {
      type: Boolean,
    },
    tickets: {
      type: Array,
    },
    artists: {
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

    categories: {
      type: Array,
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
    status: {
      type: Object,
    },
    lottery: {
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
    store: { type: Array },
  },
  { timestamps: true }
);

module.exports = mongoose.model("event", eventSchema);
