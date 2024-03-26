const purchaseSchema = require("../models/purchase");
const { updateUser } = require("../controllers/user");

const buyTickets = async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;
  const purchaseDetails = req.body.details;

  try {
    const eventticket = req.body?.userUpdates.eventTicket;

    const newPurchase = await purchaseSchema.create(purchaseDetails);

    const userUpdates = req.body?.userUpdates;
    req.body.updates = userUpdates.updates;
    req.body.operation = userUpdates.operation;
    req.body.eventTicket = userUpdates.eventTicket;

    req.params.id = req.user.userId;

    updateUser(req, res, next);
    // return res.status(200).json({ msg: "added" });
  } catch (error) {
    console.log(error);
    return res.status(401).json({ msg: "Error retrieving token" });
  }
};

module.exports = { buyTickets };
