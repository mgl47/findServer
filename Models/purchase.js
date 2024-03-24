const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    uuid: {
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

    tickets: {
      type: Array,
    },
    total: {
      type: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("purchase", purchaseSchema);
