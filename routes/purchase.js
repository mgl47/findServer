const express = require("express");
const purchaseRouter = express.Router();

const {
  buyTickets,
  checkInAttendee,
  checkCoupon,
} = require("../controllers/purchase");

//purchase a ticket by a user
purchaseRouter.route("/").post(buyTickets).get(checkCoupon);

purchaseRouter.route("/checkin/:id").patch(checkInAttendee);

//   .patch(updateUser)
//   .delete(deleteAccount);

module.exports = purchaseRouter;
