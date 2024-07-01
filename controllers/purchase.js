const purchaseSchema = require("../models/purchase");
const eventSchema = require("../models/event");
const userSchema = require("../models/user");

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
    // Extract parameters and body data from the request
    const { id } = req.params;
    const { uuid, exiting, checkedAt, exitingTime, currentDate } = req.body;

    // Convert current date string to a Date object
    // const currentDate2 = new Date(currentDate);
    const currentDate2 = new Date("2024-06-11T09:00:00.000Z");
    const now = new Date();
    console.log(exiting);

    // Find the attendee based on event ID and ticket UUID
    const attendee = await purchaseSchema.findOne({
      "event._id": id,
      "tickets.uuid": uuid,
    });

    // If attendee is not found, return a 404 response
    if (!attendee) {
      return res.status(404).json({
        msg: "Este bilhete é inválido ou não pertence a este evento!",
      });
    }

    // Initialize variables to track the user's state and actions
    let isWithinTimeframe = false;
    let userAlreadyLeft = false;
    let userAlreadyCheckedIn = false;
    let userLeavingWithoutCheckIn = false;
    let userLeftAndReturned = false;
    let userExiting = false;
    let userCheckingIn = false;
    let scannedDate = {};

    // Update the attendee's tickets based on the current date and action
    const updatedAttendees = attendee?.tickets?.map((ticket) => {
      if (ticket?.uuid === uuid) {
        const updatedDates = ticket.dates.map((date) => {
          const startDate = new Date(date.startDate);
          const endDate = new Date(date.endDate);

          // Calculate the valid timeframe (2 hours before start and 2 hours after end)
          const twoHoursBeforeStart = new Date(
            startDate.getTime() - 2 * 60 * 60 * 1000
          );
          const twoHoursAfterEnd = new Date(
            endDate.getTime() + 2 * 60 * 60 * 1000
          );

          // Check if the current date is within the valid timeframe
          if (
            currentDate2 >= twoHoursBeforeStart &&
            currentDate2 <= twoHoursAfterEnd
          ) {
            const updatedDate = { ...date };
            isWithinTimeframe = true;

            // Handle different actions based on the current state and the "exiting" flag

            // If the user is exiting and they have already left before
            if (exiting && date?.leftAt != null) {
              userAlreadyLeft = true;
            } 
            // If the user is exiting and they are currently checked in
            else if (exiting && date?.checkedIn) {
              userExiting = true;
              updatedDate.leftAt = exitingTime;
              updatedDate.exitTime = now;
              scannedDate = { ...updatedDate };
            } 
            // If the user is exiting and they have not checked in yet
            else if (exiting && !date?.checkedIn) {
              userLeavingWithoutCheckIn = true;
            }

            // If the user is not exiting and they have left before, meaning they are returning
            if (!exiting && date?.leftAt != null) {
              userLeftAndReturned = true;
              updatedDate.lastLeftAt = updatedDate?.leftAt;
              updatedDate.lastTime = updatedDate?.exitTime;
              updatedDate.leftAt = null;
              updatedDate.exitTime = null;
              scannedDate = { ...updatedDate };
            }

            // If the user is not exiting and they are already checked in
            if (!exiting && date?.checkedIn) {
              userAlreadyCheckedIn = true;
            }

            // If the user is not exiting and they are not checked in yet
            if (!exiting && !date?.checkedIn) {
              userCheckingIn = true;
              updatedDate.checkedIn = true;
              updatedDate.arrivalTime = now;
              scannedDate = { ...updatedDate };
            }

            return updatedDate;
          }

          return date;
        });

        return {
          ...ticket,
          dates: updatedDates,
        };
      }

      return ticket;
    });

    // If the current date is not within the valid timeframe, return a 400 response
    if (!isWithinTimeframe) {
      return res
        .status(400)
        .json({ msg: "Not within the valid timeframe for any event date" });
    }

    // Update the attendee's tickets in the database
    await purchaseSchema.findOneAndUpdate(
      { "tickets.uuid": uuid },
      { $set: { tickets: updatedAttendees } }
    );

    // Log the state variables for debugging purposes
    console.log(
      "userAlreadyCheckedIn: ",
      userAlreadyCheckedIn,
      "userExiting: ",
      userExiting,
      "userAlreadyLeft: ",
      userAlreadyLeft,
      "userLeavingWithoutCheckIn: ",
      userLeavingWithoutCheckIn,
      "userLeftAndReturned: ",
      userLeftAndReturned,
      "userCheckingIn: ",
      userCheckingIn
    );

    // Return an appropriate status code based on the user's actions
    return res
      .status(
        userAlreadyLeft ? 203 : exiting ? 202 :userLeftAndReturned?204: userAlreadyCheckedIn ? 201 : 200
      )
      .json(scannedDate);
  } catch (error) {
    console.error("Error checking in attendee:", error);
    return res.status(500).json({ msg: "Erro ao processar a solicitação" });
  }
};





// const checkInAttendee = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { uuid, exiting, checkedAt, exitingTime, currentDate } = req.body;
//     // const currentDate2 = new Date(currentDate);
//     const currentDate2 = new Date("2024-06-09T21:10:35.205Z");
//     const now = new Date();

//     const attendee = await purchaseSchema.findOne({
//       "event._id": id,
//       "tickets.uuid": uuid,
//     });

//     if (!attendee) {
//       return res.status(404).json({
//         msg: "Este bilhete é inválido ou não pertence a este evento!",
//       });
//     }

//     let isWithinTimeframe = false;
//     let userAlreadyLeft = false;
//     let userAlreadyCheckedIn = false;
//     let userLeavingWithoutCheckIn = false;
//     let userLeftAndReturned = false;
//     let userExiting = false;
//     let userCheckingIn = false;
//     let scannedDate = {};

//     const updatedAttendees = attendee?.tickets?.map((ticket) => {
//       if (ticket?.uuid === uuid) {
//         const updatedDates = ticket.dates.map((date) => {
//           const startDate = new Date(date.startDate);
//           const endDate = new Date(date.endDate);

//           const twoHoursBeforeStart = new Date(
//             startDate.getTime() - 2 * 60 * 60 * 1000
//           );
//           const twoHoursAfterEnd = new Date(
//             endDate.getTime() + 2 * 60 * 60 * 1000
//           );

//           if (
//             currentDate2 >= twoHoursBeforeStart &&
//             currentDate2 <= twoHoursAfterEnd
//           ) {

//             const updatedDate = { ...date };
//             isWithinTimeframe = true;

//             if (exiting && date?.leftAt != null) {
//               userAlreadyLeft = true;
//             } else if (exiting && date?.checkedIn) {
//               userExiting = true;
//               updatedDate.leftAt = exitingTime;
//               updatedDate.exitTime = now;
//               scannedDate = { ...updatedDate };
//             } else if (exiting && !date?.checkedIn) {
//               userLeavingWithoutCheckIn = true;
//             }

//             if (!exiting && date?.leftAt != null) {
//               userLeftAndReturned = true;
//               updatedDate.lastLeftAt = updatedDate?.leftAt;
//               updatedDate.lastTime = updatedDate?.exitTime;
//               updatedDate.leftAt = null;
//               updatedDate.exitTime = null;
//               scannedDate = { ...updatedDate };
//             }

//             if (!exiting && date?.checkedIn) {
//               userAlreadyCheckedIn = true;
//             }

//             if (!exiting && !date?.checkedIn) {
//               userCheckingIn = true;
//               updatedDate.checkedIn = true;
//               updatedDate.arrivalTime = now;
//               scannedDate = { ...updatedDate };
//             }

//             return updatedDate;
//           }

//           return date;
//         });

//         return {
//           ...ticket,
//           dates: updatedDates,
//         };
//       }

//       return ticket;
//     });
//     if (!isWithinTimeframe) {
//       console.log("adfs");

//       return res
//         .status(400)
//         .json({ msg: "Not within the valid timeframe for any event date" });
//     }

//     await purchaseSchema.findOneAndUpdate(
//       { "tickets.uuid": uuid },
//       { $set: { tickets: updatedAttendees } }
//     );
//     console.log(
//       "userAlreadyCheckedIn: ",
//       userAlreadyCheckedIn,
//       "userExiting: ",
//       userExiting,
//       "userAlreadyLeft: ",
//       userAlreadyLeft,
//       "userLeavingWithoutCheckIn: ",
//       userLeavingWithoutCheckIn,
//       "userLeftAndReturned: ",
//       userLeftAndReturned,
//       "userCheckingIn: ",
//       userCheckingIn
//     );
//     return res
//       .status(
//         userAlreadyLeft ? 203 : exiting ? 202 : userAlreadyCheckedIn ? 201 : 200
//       )
//       .json(scannedDate);
//   } catch (error) {
//     console.error("Error checking in attendee:", error);
//     return res.status(500).json({ msg: "Erro ao processar a solicitação" });
//   }
// };


const getAttendees = async (req, res) => {
  try {
    const { eventId } = req.query;

    console.log(eventId);
    const event = await purchaseSchema.find({ "event._id": eventId });
    return res.status(200).json(event);
  } catch (error) {
    console.error("Error getting attendees:", error);
    return res.status(500).json({ msg: "Erro ao processar a solicitação" });
  }
};

const handleAttendees = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      user: currentUser,
      body: { updates, operation },
    } = req;

    const purchase = await purchaseSchema.findOne({ purchaseId: id });

    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    let updatedEvent;

    switch (operation?.type) {
      case "attendeeLottery":
        if (operation.task === "add") {
          updatedEvent = await lotteryOperation(
            id,
            purchase,
            operation,
            updates
          );
        }
        break;
      default:
        return res.status(400).json({ message: "Invalid operation type" });
    }

    res.status(200).json({ message: "Operation successful", updatedEvent });
  } catch (error) {
    console.error("Error handling attendees:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const lotteryOperation = async (id, purchase, operation, updates) => {
  let updatedTickets = purchase?.tickets?.map((ticket) => {
    if (ticket.uuid === operation?.ticketId) {
      return {
        ...ticket,
        lottery: updates.lottery,
      };
    }
    return ticket;
  });

  const updatedPurchase = await purchaseSchema.findOneAndUpdate(
    { purchaseId: id },
    { tickets: updatedTickets },
    { new: true }
  );

  const user = await userSchema.findOne({
    username: purchase?.user?.endUser?.username,
  });

  if (!user) {
    throw new Error("User not found");
  }

  const newNotification = {
    type: "lottery",
    title: `Você foi sorteado para o evento ${purchase?.event.title}`,
    message: `Parabéns ${user.displayName}, você foi sorteado para o evento ${purchase?.event.title}`,
    prize: updates?.lottery?.prize,
    id: updates?.lottery?.id,
  };

  const updatedUser = await userSchema.findByIdAndUpdate(
    user._id,
    { $push: { notifications: newNotification } },
    { new: true }
  );

  return updatedPurchase;
};

//  case "attendeeLottery":
// if (operation.task === "add") {
//   updatedEvent = await handleAttendeeLotteryOperation(
//     event,
//     newChanges
//   );
// }
// break;
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

module.exports = {
  buyTickets,
  checkInAttendee,
  checkCoupon,
  handleAttendees,
  getAttendees,
};

{
  /*
  
  const checkInAttendee = async (req, res) => {
  try {
    const { id } = req.params;
    const { uuid, exiting, checkedAt, exitingTime, currentDate } = req.body;
    const currentDate2 = new Date(currentDate);

    const attendees = await purchaseSchema.find({ "event._id": id });
    const separatedAttendees = attendees?.reduce((acc, purchase) => {
      if (purchase?.tickets) {
        acc.push(...purchase.tickets); //a Use the spread operator to flatten the array
      }
      return acc;
    }, []);

    const ticketUser = separatedAttendees?.find(
      (attendee) => attendee?.uuid === uuid
    );

    if (!ticketUser) {
      return res.status(404).json({
        msg: "Este bilhete é inválido ou não pertence a este evento!",
      });
    }

    // if()

    const isWithinTimeframe = ticketUser?.dates?.some((date) => {



      const dateObj = new Date(date.date);

      const twoHoursBefore = new Date(
        currentDate2.getTime() - 2 * 60 * 60 * 1000
      );

      const twelveHoursAfter = new Date(
        currentDate2.getTime() + 12 * 60 * 60 * 1000
      );
      return dateObj > twoHoursBefore && dateObj < twelveHoursAfter;
    });

    if (!isWithinTimeframe) {
      if (ticketUser?.validated) {
        console.log("Bilhete já validado!");
        return res.status(204).json({ msg: "Este bilhete já foi validado!" });
      }

      // Update attendee's status to "validated" within the purchase document
      await purchaseSchema.findOneAndUpdate(
        { "tickets.uuid": uuid },
        { $set: { "tickets.$.validated": checkedAt } }
      );

      console.log("Bilhete validado com sucesso!");

      // Respond with updated attendee information
      // return res.status(204).json({ msg: "Bilhete validado com sucesso!" });
      return res.status(205).json(ticketUser);
    }

    if (ticketUser && !exiting) {
      // If attendee is already checked in, return it without updating
      return res.status(201).json(ticketUser);
    }

    const purchase = await purchaseSchema.findOne({
      purchaseId: ticketUser?.purchaseId,
    });
    // console.log(purchase);

    // Update event attendees
    let userHadLeft = false;
    const updatedAttendees = separatedAttendees?.map((attendee) => {
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
  
  */
}

{
  /**
  first
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

    // const existingAttendee = event?.attendees?.find(
    //   (attendee) =>
    //     attendee?.uuid === ticketUser?.uuid &&
    //     attendee?.checkedIn &&
    //     !attendee?.leftAt
    // );
    const existingAttendee = event?.attendees?.find(
      (attendee) => attendee?.uuid === ticketUser?.uuid
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
        console.log("Bilhete já validado!");
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
      console.log("Bilhete validado com sucesso!");

      // Respond with updated attendee information
      // return res.status(204).json({ msg: "Bilhete validado com sucesso!" });
      return res.status(205).json(existingAttendee);
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
  */
}
