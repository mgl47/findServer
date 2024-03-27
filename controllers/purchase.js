const purchaseSchema = require("../models/purchase");
const eventSchema = require("../models/event");
const { updateUser } = require("../controllers/user");

const buyTickets = async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;
  const purchaseDetails = req.body.details;
  const boughtTickets = purchaseDetails?.tickets;

  try {
    const event = await eventSchema.findById(purchaseDetails?.eventId);

    let adjustedAvailability = [...event?.tickets];
    let minus = 0;

    let eventTickets = [...event?.tickets];
    let boughtTickets = [...purchaseDetails?.tickets];
    let newEventTickets = [];

    // boughtTickets.forEach(
    //   (ticket) =>
    //     (newEventTickets = eventTickets?.map((item) => {
    //       if (ticket?.id == boughtTickets?.id) {
    //         minus+=1
    //         return { ...item, available: { available: item.available - minus } };
    //       }else{
    //         return{...item}
    //       }
    //     }))
    // );

    if (!purchaseDetails?.tickets || !event?.tickets) {
      return; // Handle if purchaseDetails or eventTickets are not available
    }

    const updatedEventTickets = [...event?.tickets];

    purchaseDetails.tickets.forEach((purchasedTicket) => {
      const eventTicketIndex = updatedEventTickets.findIndex(
        (eventTicket) => eventTicket.id === purchasedTicket.id
      );

      if (eventTicketIndex !== -1) {
        updatedEventTickets[eventTicketIndex].available -= 1; // Deduct one ticket from available quantity
      } else {
        console.warn(`Event ticket with UUID ${purchasedTicket.id} not found.`);
      }
    });

    console.log(updatedEventTickets);

    const newPurchase = await purchaseSchema.create(purchaseDetails);

    const userUpdates = req.body?.userUpdates;
    req.params.id = req.user.userId;
    req.body.updates = userUpdates.updates;
    req.body.operation = userUpdates.operation;
    req.body.eventTicket = userUpdates.eventTicket;
    req.body.updatedEventTickets = updatedEventTickets;

    updateUser(req, res, next);
  } catch (error) {
    console.log(error);
    return res.status(401).json({ msg: "Error retrieving token" });
  }
};

module.exports = { buyTickets };

// const purchaseSchema = require("../models/purchase");
// const eventSchema = require("../models/event");
// const { updateUser } = require("../controllers/user");

// const buyTickets = async (req, res, next) => {
//   const { id } = req.params;
//   const user = req.user;
//   const purchaseDetails = req.body.details;
//   const boughtTickets = purchaseDetails?.tickets;

//   try {
//     const event = await eventSchema.findById(purchaseDetails?.eventId);

//     let adjustedAvailability = [...event?.tickets];
//     let minus = 0;

//     let eventTickets = [...event?.tickets];
//     let boughtTickets = [...purchaseDetails?.tickets];
//     let newEventTickets = [];

//     // boughtTickets.forEach(
//     //   (ticket) =>
//     //     (newEventTickets = eventTickets?.map((item) => {
//     //       if (ticket?.id == boughtTickets?.id) {
//     //         minus+=1
//     //         return { ...item, available: { available: item.available - minus } };
//     //       }else{
//     //         return{...item}
//     //       }
//     //     }))
//     // );

//     if (!purchaseDetails?.tickets || !event?.tickets) {
//       return; // Handle if purchaseDetails or eventTickets are not available
//     }

//     const updatedEventTickets = [...event?.tickets];

//     purchaseDetails.tickets.forEach((purchasedTicket) => {
//       const eventTicketIndex = updatedEventTickets.findIndex(
//         (eventTicket) => eventTicket.id === purchasedTicket.id
//       );

//       if (eventTicketIndex !== -1) {
//         updatedEventTickets[eventTicketIndex].available -= 1; // Deduct one ticket from available quantity
//       } else {
//         console.warn(`Event ticket with UUID ${purchasedTicket.id} not found.`);
//       }
//     });

//     console.log(updatedEventTickets);

//     const newPurchase = await purchaseSchema.create(purchaseDetails);

//     const userUpdates = req.body?.userUpdates;
//     req.params.id = req.user.userId;
//     req.body.updates = userUpdates.updates;
//     req.body.operation = userUpdates.operation;
//     req.body.eventTicket = userUpdates.eventTicket;
//     req.body.updatedEventTickets = updatedEventTickets;

//     updateUser(req, res, next);
//   } catch (error) {
//     console.log(error);
//     return res.status(401).json({ msg: "Error retrieving token" });
//   }
// };

// module.exports = { buyTickets };
