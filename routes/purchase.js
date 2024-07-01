const express = require("express");
const purchaseRouter = express.Router();

const {
  buyTickets,
  checkInAttendee,
  checkCoupon,
  handleAttendees,
  getAttendees,
} = require("../controllers/purchase");

//purchase a ticket by a user
purchaseRouter.route("/").post(buyTickets).get(checkCoupon);

purchaseRouter.route("/checkin/:id").patch(checkInAttendee);

purchaseRouter.route("/attendees/:id").patch(handleAttendees);
purchaseRouter.route("/attendees/").get(getAttendees);

//   .patch(updateUser)
//   .delete(deleteAccount);

module.exports = purchaseRouter;
