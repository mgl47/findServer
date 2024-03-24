const express = require("express");
const purchaseRouter = express.Router();

const { buyTickets } = require("../controllers/purchase");

//purchase a ticket by a user
purchaseRouter.route("/").post(buyTickets);

//   .patch(updateUser)
//   .delete(deleteAccount);

module.exports = purchaseRouter;
