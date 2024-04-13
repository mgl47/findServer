const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
    },
    purchaseId: {
      type: String,
    },
    event: {
      type: Object,
    },
    eventId: {
      type: String,
    },

    buyer: {
      type: Object,
    },
    cardDetails: {
      type: Object,
    },
    type: {
      type: String,
    },
    uri: {
      type: String,
    },

    tickets: {
      type: Array,
    },
    total: {
      type: Number,
    },
    createdAt: { type: Date },

    updatedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("purchase", purchaseSchema);
