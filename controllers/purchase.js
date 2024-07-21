const purchaseSchema = require("../models/purchase");
const eventSchema = require("../models/event");
const userSchema = require("../models/user");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const buyTickets = async (req, res, next) => {
  const { id } = req.params;
  const currentUser = req.user;
  const { details, userUpdates, operation } = req.body;
  const addedCoupon = details?.transaction?.coupon;
  const invalidTickets = [];
  const user = await userSchema.findById(currentUser?.userId);
  //

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
      user: "txusco99@gmail.com",
      pass: "dwqiyzlhfjqyudki",
    },
  });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await userSchema
      .findById(currentUser?.userId)
      .session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ msg: "Usuário não encontrado!" });
    }

    const endUser =
      operation?.task === "gift" || operation?.task === "doorPurchase"
        ? details?.user?.endUser
        : currentUser;

    const event = await eventSchema
      .findById(operation?.eventId)
      .session(session);
    if (!details?.tickets || !event?.tickets) {
      await session.abortTransaction();
      session.endSession();
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
        await session.abortTransaction();
        session.endSession();
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
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({
        msg: `The selected quantity for the ticket "${invalidTickets?.[0]}" exceeds the available quantity. Please try again!`,
        restart: true,
      });
    }

    const newPurchase = await purchaseSchema.create([details], { session });

    await event.updateOne(
      { _id: operation?.eventId },
      {
        $set: { tickets: updatedEventTickets },
        $addToSet: { goingUsers: endUser?.userId },
        $pull: { interestedUsers: endUser?.userId },
      },
      { session }
    );

    await userSchema.updateOne(
      { _id: currentUser?.userId },
      {
        $inc: { "balance.amount": -details.total },
        $pull: { likedEvents: operation?.eventId },
        $addToSet: { goingToEvents: operation?.eventId },
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();
    // const info = await transporter.sendMail({
    //   // from: '"Maddison Foo Koch 👻" <maddison53@ethereal.email>', // sender address
    //   to: "miguelstuffs@gmail.com", // list of receivers
    //   subject: "Hello ✔", // Subject line
    //   text: "Hello world?", // plain text body
    //   html: "<b>Hello world?</b>", // html body
    // });

    // console.log("Message sent: %s", info.messageId);

    return res.status(200).json(newPurchase);
  } catch (error) {
    // await session.abortTransaction();
    // session.endSession();
    console.error(error);
    return res.status(500).json({ msg: "Error processing purchase" });
  }
};

const checkInAttendee = async (req, res) => {
  try {
    const { id } = req.params;
    const { uuid, exiting, checkedAt, exitingTime, currentDate } = req.body;

    {
      /*
 day1 
  const currentDate2 =  new Date("2024-06-09T20:00:00.000Z");
 day2 
  const currentDate2 = new Date("2024-06-10T23:00:00.000Z");  
 day3 
  const currentDate2 = new Date("2024-06-11T09:00:00.000Z");


*/
    }

    // const currentDate2 = new Date("2024-06-11T09:00:00.000Z");

    const currentDate2 = new Date(currentDate);
    const now = new Date();

    // Find the attendee based on event ID and ticket UUID
    const attendee = await purchaseSchema.findOne({
      "event._id": id,
      "tickets.uuid": uuid,
    });
    const pastEvenent =
      new Date(
        attendee?.event?.dates?.[attendee?.event?.dates?.length - 1]?.endDate
      ) < currentDate2;

    console.log(pastEvenent);

    // If attendee is not found, return a 404 response
    if (!attendee || pastEvenent) {
      return res.status(200).json({
        msg: "Este bilhete é inválido ou não pertence a este evento!",
        state: "invalidTicket",
      });
    }

    // Constants for timeframe calculations
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    // Initialize variables to track the user's state and actions
    let isWithinTimeframe = false;
    let userAlreadyLeft = false;
    let userAlreadyCheckedIn = false;
    let userLeavingWithoutCheckIn = false;
    let userLeftAndReturned = false;
    let userExiting = false;
    let userCheckingIn = false;
    let ticketValidated = false;
    let ticketAlreadyValidated = false;
    let scannedDate = {};
    let scannedTicket = {};

    // Update the attendee's tickets based on the current date and action
    const updatedTickets = attendee?.tickets?.map((ticket) => {
      if (ticket?.uuid === uuid) {
        scannedTicket = { ...ticket };
        const updatedDates = ticket.dates.map((date) => {
          const startDate = new Date(date.startDate);
          const endDate = new Date(date.endDate);

          // Calculate the valid timeframe (2 hours before start and 2 hours after end)
          const twoHoursBeforeStart = new Date(startDate.getTime() - TWO_HOURS);
          const twoHoursAfterEnd = new Date(endDate.getTime() + TWO_HOURS);

          // Check if the current date is within the valid timeframe
          if (
            currentDate2 >= twoHoursBeforeStart &&
            currentDate2 <= twoHoursAfterEnd
          ) {
            const updatedDate = { ...date };
            isWithinTimeframe = true;

            // Handle different actions based on the current state and the "exiting" flag

            if (exiting) {
              if (date.leftAt != null) {
                // If the user is exiting and they have already left before
                userAlreadyLeft = true;
              } else if (date.checkedIn) {
                // If the user is exiting and they are currently checked in
                userExiting = true;
                updatedDate.leftAt = exitingTime; // Record the exit time
                updatedDate.exitTime = now; // Record the current time as exit time
              } else if (!date.checkedIn) {
                // If the user is exiting and they have not checked in yet
                userLeavingWithoutCheckIn = true; // User attempting to leave without checking in
              }
            } else {
              if (date.leftAt != null) {
                // If the user is not exiting and they have left before, meaning they are returning
                userLeftAndReturned = true;
                updatedDate.lastLeftAt = updatedDate.leftAt; // Record the last left time
                updatedDate.lastTime = updatedDate.exitTime; // Record the last exit time
                updatedDate.leftAt = null; // Reset the leftAt time
                updatedDate.exitTime = null; // Reset the exit time
              } else if (date.checkedIn) {
                // If the user is not exiting and they are already checked in
                userAlreadyCheckedIn = true;
              } else if (!date.checkedIn) {
                // If the user is not exiting and they are not checked in yet
                userCheckingIn = true;
                updatedDate.checkedIn = true; // Mark as checked in
                updatedDate.arrivalTime = now;

                // Record the current time as arrival time
              }
            }
            scannedDate = { ...updatedDate }; // Update the scanned date with the current state
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
      const hasValidated = attendee?.tickets?.some((ticket) => {
        if (ticket.uuid === uuid) {
          return ticket.validated;
        }
      });
      if (!hasValidated) {
        await purchaseSchema.findOneAndUpdate(
          { "tickets.uuid": uuid },
          {
            $set: {
              "tickets.$.validated": true,
              "tickets.$.validatedOn": currentDate2,
            },
          }
        );
        console.log("Bilhete validado com sucesso!");
        ticketValidated = true;
        return res.status(200).json({
          scannedDate,
          scannedTicket: {
            ...scannedTicket,
            validated: true,
            validatedOn: currentDate2,
          },
          state: "ticketValidated",
        });
      }
      console.log("Este Bilhete já foi validado!");
      ticketAlreadyValidated = true;
      return res.status(200).json({
        state: "ticketAlreadyValidated",
        scannedDate,
        scannedTicket,
      });
    }

    // Update the attendee's tickets in the database
    await purchaseSchema.findOneAndUpdate(
      { "tickets.uuid": uuid },
      { $set: { tickets: updatedTickets } }
    );

    // Log the state variables for debugging purposes

    let state = "unknown";
    if (userAlreadyLeft) state = "userAlreadyLeft";
    else if (userExiting) state = "userExiting";
    else if (userLeavingWithoutCheckIn) state = "userLeavingWithoutCheckIn";
    else if (userLeftAndReturned) state = "userLeftAndReturned";
    else if (userAlreadyCheckedIn) state = "userAlreadyCheckedIn";
    else if (userCheckingIn) state = "userCheckingIn";
    else if (ticketAlreadyValidated) state = "ticketAlreadyValidated";
    else if (ticketValidated) state = "ticketValidated";

    return res.status(200).json({
      state,
      scannedDate,
      scannedTicket,
    });
  } catch (error) {
    console.error("Error checking in attendee:", error);
    return res.status(500).json({ msg: "Erro ao processar a solicitação" });
  }
};

const getAttendees = async (req, res) => {
  try {
    const { username } = req.user;
    const { eventId } = req.query;
    console.log(username);

    const event = await purchaseSchema.find({
      _id: eventId,

      // $or: [
      //   {
      //     "event.createdBy.username": username,
      //   },
      //   {
      //     "event.organizer.username": username,
      //     //to fix---fitlter by role
      //   },
      // ],
    });

    if (!event) {
      return res.status(404).json({ msg: "Evento não encontrado" });
    }
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
