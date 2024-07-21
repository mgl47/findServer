const express = require("express");
const {
  events,
  searchEvents,
  getSharedEvent,
} = require("../controllers/events");

const eventsRouter = express.Router();

eventsRouter.route("/").get(events);
eventsRouter.route("/shared").get(getSharedEvent);
eventsRouter.route("/search").get(searchEvents);

module.exports = eventsRouter;
