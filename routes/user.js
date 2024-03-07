const express = require("express");
const userRouter = express.Router();

const {
  createEvent,
  deleteEvent,
  updateEvent,
} = require("../controllers/event");

// const authMiddleware = require("../middlewares/user");
userRouter.route("/event").post(createEvent);
userRouter.route("/event/:id").patch(updateEvent).delete(deleteEvent);

module.exports = userRouter;
