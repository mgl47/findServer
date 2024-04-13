const purchaseSchema = require("../models/purchase");
const eventSchema = require("../models/event");
const userSchema = require("../models/user");

// type: "ticketPurchase",
// task: "purchase",
const buyTickets = async (req, res, next) => {
  const { id } = req.params;
  const currentUser = req.user;
  const { details, userUpdates, operation } = req.body;
  const invalidTickets = [];

//   if (operation?.type == "storePurchase"){
//     const event = await eventSchema.findById(operation?.eventId);

// let tempTransactions=



//   }
    try {
      const event = await eventSchema.findById(details?.event?._id);
      let updateQuery = {};
      let updateInterested = [...event.interestedUsers];
      let updateGoingUsers = [...event.goingUsers];

      if (!details?.tickets || !event?.tickets) {
        return;
      }

      let updatedEventTickets = [...event?.tickets];

      details.tickets.forEach((purchasedTicket) => {
        const eventTicketIndex = updatedEventTickets.findIndex(
          (eventTicket) => eventTicket.id === purchasedTicket.id
        );

        if (eventTicketIndex !== -1) {
          updatedEventTickets[eventTicketIndex].available -= 1; // Deduct one ticket from available quantity
          if (updatedEventTickets[eventTicketIndex].available < 0) {
            invalidTickets.push(purchasedTicket?.category); // Collect invalid tickets
          }
        } else {
          console.warn(
            `Event ticket with UUID ${purchasedTicket.id} not found.`
          );
        }
      });

      if (invalidTickets.length > 0) {
        return res.status(401).json({
          msg: `A quantidade selecionada para o bilhete "${invalidTickets?.[0]}" ultrapassa a quantidade disponível. Tente novamente!`,
          restart: true,
        });
      }

      const newPurchase = await purchaseSchema.create(details);

      if (event.interestedUsers?.includes(currentUser.userId)) {
        const index = updateInterested.indexOf(currentUser.userId);
        if (index !== -1) {
          updateInterested.splice(index, 1); // Remove user from interested list
        }
      }
      const index = updateGoingUsers.indexOf(currentUser.userId);
      if (index == -1) {
        updateGoingUsers.push(currentUser.userId); // add user to going list
      }
      const eventTicket = req.body?.details;
      let newAttendees = event?.attendees;
      newAttendees.push(...eventTicket?.tickets);

      updateQuery = {
        goingUsers: updateGoingUsers,
        interestedUsers: updateInterested,
        attendees: newAttendees,
        tickets: updatedEventTickets,
      };
      await event.updateOne({ $set: updateQuery }, { new: true });

      await userSchema.findByIdAndUpdate(currentUser?.userId, userUpdates);
      return res.status(200).json({ msg: "purchased" });
    } catch (error) {
      console.log(error);
      return res.status(401).json({ msg: "Error retrieving token" });
    }
};
const checkInAttendee = async (req, res) => {
  try {
    const { id } = req.params;
    const { uuid, exiting } = req.body;
    const event = await eventSchema.findById(id);
    const alreadyScanned = [];
    // console.log(exiting);
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    const ticketUser = await event?.attendees?.filter(
      (attendee) => attendee?.uuid == uuid
    )[0];

    if (!ticketUser) {
      return res.status(404).json({
        msg: "Este bilhete é inválido ou não pertence a este evento!",
      });
    }

    const existingAttendee = event?.attendees?.find(
      (attendee) =>
        attendee?.uuid === ticketUser?.uuid &&
        attendee?.checkedIn &&
        !attendee?.leftAt
    );

    if (existingAttendee && !exiting) {
      // If attendee is already checked in, return it without updating
      return res.status(201).json(existingAttendee);
    }

    const purchase = await purchaseSchema.findOne({
      purchaseId: ticketUser?.purchaseId,
    });
    // console.log(purchase);

    // Update event attendees
    let userHadLeft = false;
    const updatedAttendees = event?.attendees?.map((attendee) => {
      if (attendee?.uuid === ticketUser?.uuid) {
        const updatedAttendee = {
          ...attendee,
          checkedIn: true,
          arrivalTime: now,
        };

        if (!exiting && attendee?.leftAt != null) {
          userHadLeft = true;
        }
        if (exiting) {
          updatedAttendee.leftAt = time;
          updatedAttendee.exitTime = now;
        } else {
          updatedAttendee.lastLeftAt = updatedAttendee?.leftAt;
          updatedAttendee.lastTime = updatedAttendee?.exitTime;
          updatedAttendee.leftAt = null;
          updatedAttendee.exitTime = null;

          if (!updatedAttendee.lastLeftAt) {
            updatedAttendee.checkedAt = time;
          }
        }

        return updatedAttendee;
      }
      return attendee;
    });

    await event.updateOne({ attendees: updatedAttendees });

    let scannedTicket = {};

    const updatedTickets = purchase?.tickets?.map((ticket) => {
      if (ticket?.uuid === ticketUser?.uuid) {
        const updatedTicket = {
          ...ticket,
          checkedIn: true,
          arrivalTime: now,
        };

        if (exiting) {
          updatedTicket.leftAt = time;
          updatedTicket.exitTime = now;
        } else {
          updatedTicket.lastLeftAt = updatedTicket?.leftAt;
          updatedTicket.lastTime = updatedTicket?.exitTime;
          updatedTicket.leftAt = null;
          updatedTicket.exitTime = null;
          if (!updatedTicket.lastLeftAt) {
            updatedTicket.checkedAt = time;
          }
        }

        scannedTicket = { ...updatedTicket }; // Assign scannedTicket value
        return updatedTicket;
      }
      return ticket;
    });

    await purchase.updateOne({ tickets: updatedTickets });
    // console.log(scannedTicket);
    return res
      .status(userHadLeft ? 203 : exiting ? 202 : 200)
      .json(scannedTicket);
  } catch (error) {
    console.error("Error checking in attendee:", error);
    return res.status(500).json({ msg: "Erro ao processar a solicitação" });
  }
};

module.exports = { buyTickets, checkInAttendee };

// const purchaseSchema = require("../models/purchase");
// const eventSchema = require("../models/event");
// const userSchema = require("../models/user");

// // type: "ticketPurchase",
// // task: "purchase",
// const buyTickets = async (req, res, next) => {
//   const { id } = req.params;
//   const currentUser = req.user;
//   const { details, userUpdates } = req.body;
//   const invalidTickets = [];

//   try {
//     const event = await eventSchema.findById(details?.event?._id);
//     let updateQuery = {};
//     let updateInterested = [...event.interestedUsers];
//     let updateGoingUsers = [...event.goingUsers];

//     if (!details?.tickets || !event?.tickets) {
//       return;
//     }

//     let updatedEventTickets = [...event?.tickets];

//     details.tickets.forEach((purchasedTicket) => {
//       const eventTicketIndex = updatedEventTickets.findIndex(
//         (eventTicket) => eventTicket.id === purchasedTicket.id
//       );

//       if (eventTicketIndex !== -1) {
//         updatedEventTickets[eventTicketIndex].available -= 1; // Deduct one ticket from available quantity
//         if (updatedEventTickets[eventTicketIndex].available < 0) {
//           invalidTickets.push(purchasedTicket?.category); // Collect invalid tickets
//         }
//       } else {
//         console.warn(`Event ticket with UUID ${purchasedTicket.id} not found.`);
//       }
//     });

//     if (invalidTickets.length > 0) {
//       return res.status(401).json({
//         msg: `A quantidade selecionada para o bilhete "${invalidTickets?.[0]}" ultrapassa a quantidade disponível. Tente novamente!`,
//         restart: true,
//       });
//     }

//     const newPurchase = await purchaseSchema.create(details);

//     if (event.interestedUsers?.includes(currentUser.userId)) {
//       const index = updateInterested.indexOf(currentUser.userId);
//       if (index !== -1) {
//         updateInterested.splice(index, 1); // Remove user from interested list
//       }
//     }
//     const index = updateGoingUsers.indexOf(currentUser.userId);
//     if (index == -1) {
//       updateGoingUsers.push(currentUser.userId); // add user to going list
//     }
//     const eventTicket = req.body?.details;
//     let newAttendees = event?.attendees;
//     newAttendees.push(...eventTicket?.tickets);

//     updateQuery = {
//       goingUsers: updateGoingUsers,
//       interestedUsers: updateInterested,
//       attendees: newAttendees,
//       tickets: updatedEventTickets,
//     };
//     await event.updateOne({ $set: updateQuery }, { new: true });

//     await userSchema.findByIdAndUpdate(currentUser?.userId, userUpdates);
//     return res.status(200).json({ msg: "purchased" });
//   } catch (error) {
//     console.log(error);
//     return res.status(401).json({ msg: "Error retrieving token" });
//   }
// };
// const checkInAttendee = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { uuid, exiting } = req.body;
//     const event = await eventSchema.findById(id);
//     const alreadyScanned = [];
//     // console.log(exiting);
//     const now = new Date();
//     const time = `${now.getHours().toString().padStart(2, "0")}:${now
//       .getMinutes()
//       .toString()
//       .padStart(2, "0")}`;
//     const ticketUser = await event?.attendees?.filter(
//       (attendee) => attendee?.uuid == uuid
//     )[0];

//     if (!ticketUser) {
//       return res.status(404).json({
//         msg: "Este bilhete é inválido ou não pertence a este evento!",
//       });
//     }

//     const existingAttendee = event?.attendees?.find(
//       (attendee) =>
//         attendee?.uuid === ticketUser?.uuid &&
//         attendee?.checkedIn &&
//         !attendee?.leftAt
//     );

//     if (existingAttendee && !exiting) {

//       // If attendee is already checked in, return it without updating
//       return res.status(201).json(existingAttendee);
//     }

//     const purchase = await purchaseSchema.findOne({
//       purchaseId: ticketUser?.purchaseId,
//     });
//     // console.log(purchase);

//     // Update event attendees
//     let userHadLeft = false;
//     const updatedAttendees = event?.attendees?.map((attendee) => {
//       if (attendee?.uuid === ticketUser?.uuid) {
//         const updatedAttendee = {
//           ...attendee,
//           checkedIn: true,
//           arrivalTime: now,
//         };

//         if (!exiting && attendee?.leftAt != null) {
//           userHadLeft = true;
//         }
//         if (exiting) {
//           updatedAttendee.leftAt = time;
//           updatedAttendee.exitTime = now;
//         } else {
//           updatedAttendee.lastLeftAt = updatedAttendee?.leftAt;
//           updatedAttendee.lastTime = updatedAttendee?.exitTime;
//           updatedAttendee.leftAt = null;
//           updatedAttendee.exitTime = null;

//           if (!updatedAttendee.lastLeftAt) {
//             updatedAttendee.checkedAt = time;
//           }
//         }

//         return updatedAttendee;
//       }
//       return attendee;
//     });

//     await event.updateOne({ attendees: updatedAttendees });

//     let scannedTicket = {};

//     const updatedTickets = purchase?.tickets?.map((ticket) => {
//       if (ticket?.uuid === ticketUser?.uuid) {
//         const updatedTicket = {
//           ...ticket,
//           checkedIn: true,
//           arrivalTime: now,
//         };

//         if (exiting) {
//           updatedTicket.leftAt = time;
//           updatedTicket.exitTime = now;
//         } else {
//           updatedTicket.lastLeftAt = updatedTicket?.leftAt;
//           updatedTicket.lastTime = updatedTicket?.exitTime;
//           updatedTicket.leftAt = null;
//           updatedTicket.exitTime = null;
//           if (!updatedTicket.lastLeftAt) {
//             updatedTicket.checkedAt = time;
//           }
//         }

//         scannedTicket = { ...updatedTicket }; // Assign scannedTicket value
//         return updatedTicket;
//       }
//       return ticket;
//     });

//     await purchase.updateOne({ tickets: updatedTickets });
//     // console.log(scannedTicket);
//     return res
//       .status(userHadLeft ? 203 : exiting ? 202 : 200)
//       .json(scannedTicket);
//   } catch (error) {
//     console.error("Error checking in attendee:", error);
//     return res.status(500).json({ msg: "Erro ao processar a solicitação" });
//   }
// };

// module.exports = { buyTickets, checkInAttendee };
