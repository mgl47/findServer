const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      lowercase: true,
    },
    password: {
      type: String,
    },
    uuid: {
      type: String,
    },
    email: {
      type: String,
      lowercase: true,
    },
    displayName: {
      type: String,
    },
    userDescription: {
      type: String,
    },
    photos: {
      type: Object,
    },
    phone: {
      type: Object,
    },
    balance: {
      type: Object,
      default: { amount: 0 },
    },
    socials: {
      type: Object,
    },
    medias: {
      type: Object,
    },
    status: {
      type: Object,
    },
    likedEvents: {
      type: Array,
      default: [],
    },
    goingToEvents: {
      type: Array,
      default: [],
    },
    followers: {
      type: Array,
    },
    followedArtists: {
      type: Array,
    },
    followedVenues: {
      type: Array,
    },
    notifications: {
      type: Array,
    },

    // purchasedTickets: {
    //   type: Array,
    //   default: [],
    // },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model("user", userSchema);
