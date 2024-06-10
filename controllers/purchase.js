const purchaseSchema = require("../models/purchase");
const eventSchema = require("../models/event");
const userSchema = require("../models/user");

// type: "ticketPurchase",
// task: "purchase",
// const buyTickets = async (req, res, next) => {
//   const { id } = req.params;
//   const currentUser = req.user;
//   const { details, userUpdates, operation } = req.body;
//   const addedCoupon = details?.transaction?.coupon;
//   const invalidTickets = [];

//   const endUSer =
//     operation?.task == "gift" || operation?.task == "doorPurchase"
//       ? details?.user?.endUser
//       : currentUser;

//   try {
//     const event = await eventSchema.findById(details?.event?._id);
//     let updateQuery = {};
//     let updateInterested = [...event.interestedUsers];
//     let updateGoingUsers = [...event.goingUsers];

//     if (!details?.tickets || !event?.tickets) {
//       return;
//     }

//     let updatedEventTickets = [...event?.tickets];

//     // let updatedEventTickets = null;
//     let matchedCoupon = null;
//     if (addedCoupon) {
//       updatedEventTickets?.forEach((ticket) => {
//         if (
//           ticket?.coupon?.quantity > 0 &&
//           ticket?.coupon?.label == addedCoupon?.label
//         ) {
//           console.log("Matched coupon", ticket.coupon);

//           matchedCoupon = ticket.coupon;
//         }
//       });

//       if (matchedCoupon) {
//         const couponIndex = updatedEventTickets.findIndex(
//           (ticket) => ticket.coupon?.label === matchedCoupon?.label
//         );
//         if (couponIndex !== -1) {
//           updatedEventTickets[couponIndex].coupon.quantity -= 1;
//         }
//       } else {
//         return res.status(404).json({ msg: "Cupom inválido" });
//       }
//     }

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

//     if (event.interestedUsers?.includes(endUSer.userId)) {
//       const index = updateInterested.indexOf(endUSer.userId);
//       if (index !== -1) {
//         updateInterested.splice(index, 1); // Remove user from interested list
//       }
//     }

//     const index = updateGoingUsers.indexOf(endUSer.userId);
//     if (index == -1) {
//       updateGoingUsers.push(endUSer.userId); // add user to going list
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

//     await userSchema.findByIdAndUpdate(currentUser?.userId, {
//       userUpdates,
//       $inc: {
//         "balance.amount": addedCoupon
//           ? -(details.total - addedCoupon?.value)
//           : -details.total,
//       },
//     });
//     return res.status(200).json(newPurchase);
//   } catch (error) {
//     console.log(error);
//     return res.status(401).json({ msg: "Error retrieving token" });
//   }
// };

const buyTickets = async (req, res, next) => {
  const { id } = req.params;
  const currentUser = req.user;
  const { details, userUpdates, operation } = req.body;
  const addedCoupon = details?.transaction?.coupon;
  const invalidTickets = [];

  const endUser =
    operation?.task === "gift" || operation?.task === "doorPurchase"
      ? details?.user?.endUser
      : currentUser;

  try {
    const event = await eventSchema.findById(details?.event?._id);
    if (!details?.tickets || !event?.tickets) {
      return res
        .status(400)
        .json({ msg: "Evento ou Bilhetes não encontrados!", restart: true });
    }

    let updatedEventTickets = [...event.tickets];
    let matchedCoupon = null;

    // Handle coupon
    if (addedCoupon) {
      matchedCoupon = updatedEventTickets.find(
        (ticket) =>
          ticket?.coupon?.quantity > 0 &&
          ticket?.coupon?.label === addedCoupon?.label
      );

      if (matchedCoupon) {
        matchedCoupon.coupon.quantity -= 1;
      } else {
        return res
          .status(401)
          .json({ msg: "Coupon Inválido ou indisponível!" });
      }
    }

    // Process ticket purchases
    details.tickets.forEach((purchasedTicket) => {
      const eventTicket = updatedEventTickets.find(
        (ticket) => ticket.id === purchasedTicket.id
      );

      if (eventTicket) {
        eventTicket.available -= 1;
        if (eventTicket.available < 0) {
          invalidTickets.push(purchasedTicket?.category);
        }
      } else {
        console.warn(`Event ticket with UUID ${purchasedTicket.id} not found.`);
      }
    });

    if (invalidTickets.length > 0) {
      return res.status(401).json({
        msg: `The selected quantity for the ticket "${invalidTickets?.[0]}" exceeds the available quantity. Please try again!`,
        restart: true,
      });
    }

    const newPurchase = await purchaseSchema.create(details);

    // Update interested and going users
    const updateInterested = [...event.interestedUsers];
    const updateGoingUsers = [...event.goingUsers];

    if (updateInterested.includes(endUser.userId)) {
      updateInterested.splice(updateInterested.indexOf(endUser.userId), 1);
    }

    if (!updateGoingUsers.includes(endUser.userId)) {
      updateGoingUsers.push(endUser.userId);
    }

    const newAttendees = [...event.attendees, ...details.tickets];

    const updateQuery = {
      goingUsers: updateGoingUsers,
      interestedUsers: updateInterested,
      attendees: newAttendees,
      tickets: updatedEventTickets,
    };

    await event.updateOne({ $set: updateQuery }, { new: true });

    await userSchema.findByIdAndUpdate(currentUser?.userId, {
      userUpdates,
      $inc: {
        "balance.amount": -details.total,
        // "balance.amount": addedCoupon
        //   ? -(details.total - addedCoupon?.value)
        //   : -details.total,
      },
    });

    return res.status(200).json(newPurchase);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Error processing purchase" });
  }
};

const checkInAttendee = async (req, res) => {
  try {
    const { id } = req.params;
    const { uuid, exiting, checkedAt, exitingTime, currentDate } = req.body;
    const event = await eventSchema.findById(id);

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

    const isWithinTimeframe = existingAttendee?.dates?.some((date) => {
      const dateObj = new Date(date.date);
      const twoHoursBefore = new Date(
        currentDate.getTime() - 2 * 60 * 60 * 1000
      );
      const twelveHoursAfter = new Date(
        currentDate.getTime() + 12 * 60 * 60 * 1000
      );
      return dateObj > twoHoursBefore && dateObj < twelveHoursAfter;
    });

    if (!isWithinTimeframe) {
      if (existingAttendee?.validated) {
        return res.status(204).json({ msg: "Este bilhete já foi validado!" });
      }
      // Remove ticket from purchase schema
      await purchaseSchema.findOneAndUpdate(
        { purchaseId: ticketUser?.purchaseId },
        { $pull: { tickets: { uuid: ticketUser?.uuid } } },
        { validated: checkedAt }
      );

      // Update attendee's status to "validated" within the event document
      await eventSchema.updateOne(
        { "attendees.uuid": ticketUser?.uuid },
        { $set: { "attendees.$.validated": checkedAt } }
      );

      // Respond with updated attendee information
      return res.status(204).json({ msg: "Bilhete validado com sucesso!" });
    }

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
          updatedAttendee.leftAt = exitingTime;
          updatedAttendee.exitTime = now;
        } else {
          updatedAttendee.lastLeftAt = updatedAttendee?.leftAt;
          updatedAttendee.lastTime = updatedAttendee?.exitTime;
          updatedAttendee.leftAt = null;
          updatedAttendee.exitTime = null;

          if (!updatedAttendee.lastLeftAt) {
            updatedAttendee.checkedAt = checkedAt;
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
          updatedTicket.leftAt = exitingTime;
          updatedTicket.exitTime = now;
        } else {
          updatedTicket.lastLeftAt = updatedTicket?.leftAt;
          updatedTicket.lastTime = updatedTicket?.exitTime;
          updatedTicket.leftAt = null;
          updatedTicket.exitTime = null;
          if (!updatedTicket.lastLeftAt) {
            updatedTicket.checkedAt = checkedAt;
          }
        }

        scannedTicket = { ...updatedTicket }; // Assign scannedTicket value
        return updatedTicket;
      }
      return ticket;
    });

    await purchase.updateOne({ tickets: updatedTickets });
    return res
      .status(userHadLeft ? 203 : exiting ? 202 : 200)
      .json(scannedTicket);
  } catch (error) {
    console.error("Error checking in attendee:", error);
    return res.status(500).json({ msg: "Erro ao processar a solicitação" });
  }
};
const checkCoupon = async (req, res) => {
  const { couponCode, eventId } = req.query;
  let foundCoupon = null;
  const event = await eventSchema.findById(eventId);
  const coupon = event?.tickets?.forEach((ticket) => {
    if (ticket?.coupon?.label == couponCode && ticket?.coupon?.quantity > 0) {
      foundCoupon = ticket;
    }
  });
  if (!foundCoupon) {
    return res.status(404).json({ msg: "Cupom inválido" });
  }
  if (foundCoupon) {
    return res.status(200).json(foundCoupon);
  }

  // else if (coupon?.used) {
  return res.status(409).json({ msg: "Cupom já utilizado" });
  // }
};

module.exports = { buyTickets, checkInAttendee, checkCoupon };
