const express = require("express");
const userRouter = express.Router();

const {
  createEvent,
  deleteEvent,
  updateEvent,
  createVenue,
} = require("../controllers/event");
const {getInfo, updateUser, deleteAccount } = require("../controllers/user");



userRouter.route("/current/:id").get(getInfo).patch(updateUser).delete(deleteAccount)


// userRouter.route("/likeEvent").patch(likeEvent);
// userRouter.route("/likeUser").patch(likeUser);
// userRouter.route("/likeVenue").patch(likeVenue);

userRouter.route("/event").post(createEvent);
userRouter.route("/event/:id").patch(updateEvent).delete(deleteEvent);
userRouter.route("/venue").post(createVenue);
module.exports = userRouter;
