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
      type: Array,
    },
    socials: {
      type: Object,
    },
    medias: {
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
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model("user", userSchema);
