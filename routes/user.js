const express = require("express");
const userRouter = express.Router();

const {
  createEvent,
  deleteEvent,
  updateEvent,
  createVenue,
  getMyEvents,
  getOneEvent,
} = require("../controllers/event");
const { getInfo, updateUser, deleteAccount ,registerArtist} = require("../controllers/user");

//get,update,delete current user
userRouter.route("/current/").get(getInfo).post(registerArtist);
userRouter
  .route("/current/:id")
  .patch(updateUser)
  .delete(deleteAccount);



//create, edit, delete event by a user

userRouter.route("/event/one").get(getOneEvent);

userRouter.route("/event").post(createEvent).get(getMyEvents);
userRouter.route("/event/:id").patch(updateEvent).delete(deleteEvent);

//creata venue by a user
userRouter.route("/venue").post(createVenue);

//purchase a ticket by a user

module.exports = userRouter;
