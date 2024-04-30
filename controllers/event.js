const eventSchema = require("../models/event");
const venueSchema = require("../models/venue");
const userSchema = require("../models/user");
const purchaseSchema = require("../models/purchase");
const user = require("../models/user");

const createVenue = async (req, res) => {
  const user = req.user;
  const newVenue = {
    ...req.body,
    createdBy: user.userId,
  };

  try {
    const venue = await venueSchema.create(newVenue);
    return res.status(200).json(venue);
  } catch (error) {
    console.log("Error creating new venue:", error);
    return res.status(500).json({ msg: "Error creating new venue" });
  }
};

const createEvent = async (req, res) => {
  const user = req.user;

  const newEvent = {
    ...req.body,
    createdBy: {
      ...req.body.createdBy,
      userId: user.userId,
      username: user.username,
    },
  };

  try {
    const event = await eventSchema.create(newEvent);
    await venueSchema.findByIdAndUpdate(req.body?.venue?._id, {
      $inc: { activeEvents: 1 },
    });

    return res.status(200).json(event);
  } catch (error) {
    console.log("Error creating new event:", error);
    return res.status(500).json({ msg: "Error creating new event" });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const newChanges = req.body?.updates;
    const operation = req.body?.operation;

    const event = await eventSchema.findById(id);
    let updatedEvent = {};
    if (!event) {
      return res.status(404).json({ msg: "Event not found!" });
    }

    if (
      !(
        event.createdBy.userId != currentUser.userId ||
        event?.staff.find(
          (user) =>
            user._id == currentUser.userId && user.role == "Administração"
        ) == undefined
      )
    ) {
      return res.status(401).json({ msg: "Wrong User!" });
    }

    // if (operation?.type === "eventAttendees" && operation?.task === "checkIn") {
    //   await checkInAttendee(event, newChanges);
    // } else
    if (operation?.type === "eventStatus") {
      let updatedStaff = event.staff.slice(); // Copy the array
      switch (operation.task) {
        case "addStaff":
          updatedStaff.push(newChanges?.newStaff);
          break;
        case "removeStaff":
          updatedStaff = updatedStaff.filter(
            (staff) => staff.uuid !== newChanges?.oldStaff?.uuid
          );
          break;
        case "updateStaff":
          updatedStaff = updatedStaff.map((staff) => {
            if (staff.uuid === newChanges?.uuid) {
              return { ...staff, role: newChanges?.role };
            }
            return staff;
          });
          break;
        default:
          break;
      }
      updatedEvent = await event.updateOne({ staff: updatedStaff });
    }
    if (operation?.type == "ticketStatus" && operation?.task == "halt") {
      updatedEvent = await eventSchema.findByIdAndUpdate(id, {
        haltedSales: !event.haltedSales,
      });
    }

    return res.status(200).json(updatedEvent);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

// const checkInAttendee = async (event, changes) => {
//   try {
//     const now = new Date();
//     const time = `${now.getHours().toString().padStart(2, "0")}:${now
//       .getMinutes()
//       .toString()
//       .padStart(2, "0")}`;

//     // Update event attendees
//     const updatedAttendees = event.attendees.map((attendee) => {
//       if (attendee.uuid === changes.ticketUser.uuid) {
//         return {
//           ...attendee,
//           checkedIn: true,
//           checkedAt: time,
//           arrivalTime: now,
//         };
//       }
//       return attendee;
//     });
//     await event.updateOne({ attendees: updatedAttendees });

//     const purchase = await purchaseSchema.findOne({
//       purchaseId: changes.ticketUser.purchaseId,
//     });
//     const updatedTickets = purchase.tickets.map((ticket) => {
//       if (ticket.uuid === changes.ticketUser.uuid) {
//         return {
//           ...ticket,
//           checkedIn: true,
//           checkedAt: time,
//           arrivalTime: now,
//         };
//       }
//       return ticket;
//     });
//     await purchaseSchema.findOneAndUpdate(
//       { purchaseId: changes.ticketUser.purchaseId },
//       { $set: { tickets: updatedTickets } },
//       { new: true }
//     );
//   } catch (error) {
//     console.error("Error checking in attendee:", error);
//   }
// };

const getMyEvents = async (req, res) => {
  const { userId } = req.user;

  try {
    const events = await eventSchema.find({
      $or: [{ staffIds: userId }, { creatorId: userId }],
    });

    return res.status(200).json(events);
  } catch (error) {
    console.log("Error fetching events:", error);
    return res.status(500).json({ msg: "Error fetching events" });
  }
};
const getOneEvent = async (req, res) => {
  const { userId } = req.user;
  const { eventId } = req.query;

  try {
    const event = await eventSchema.findById(eventId);

    return res.status(200).json(event);
  } catch (error) {
    console.log("Error fetching events:", error);
    return res.status(500).json({ msg: "Error fetching events" });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const event = await eventSchema.findByIdAndDelete(id);

    if (!event) {
      return res.status(404).json({ msg: "Event not found!" });
    }

    if (event.createdBy.userId !== user.userId) {
      return res.status(401).json({ msg: "Wrong User!" });
    }

    return res.status(200).json({ msg: "Event deleted!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

module.exports = {
  createEvent,
  deleteEvent,
  updateEvent,
  createVenue,
  getMyEvents,
  getOneEvent,
};
