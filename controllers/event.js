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

// const updateEvent = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const currentUser = req.user;
//     const newChanges = req.body?.updates;
//     const operation = req.body?.operation;

//     const event = await eventSchema.findById(id);
//     if (!event) {
//       return res.status(404).json({ msg: "Event not found!" });
//     }

//     if (
//       !(
//         event.createdBy.userId === currentUser.userId ||
//         event.staff.some(
//           (user) =>
//             user._id === currentUser.userId && user.role === "Administração"
//         )
//       )
//     ) {
//       return res.status(401).json({ msg: "Wrong User!" });
//     }

//     let updatedEvent;
//     if (operation?.type === "eventStatus") {
//       let updatedStaff = event.staff.slice(); // Copy the array
//       switch (operation.task) {
//         case "addStaff":
//           updatedStaff.push(newChanges?.newStaff);
//           break;
//         case "removeStaff":
//           updatedStaff = updatedStaff.filter(
//             (staff) => staff.uuid !== newChanges?.oldStaff?.uuid
//           );
//           break;
//         case "updateStaff":
//           updatedStaff = updatedStaff.map((staff) => {
//             if (staff.uuid === newChanges?.uuid) {
//               return { ...staff, role: newChanges?.role };
//             }
//             return staff;
//           });
//           break;
//         default:
//           break;
//       }
//       updatedEvent = await eventSchema.findByIdAndUpdate(
//         id,
//         { staff: updatedStaff },
//         { new: true }
//       );
//     } else if (
//       operation?.type === "ticketStatus" &&
//       operation?.task === "halt"
//     ) {

//       event?.tickets?.forEach(async (ticket) => {
//         if (ticket?.id == newChanges?.ticketId) {
//           ticket.haltSale = !ticket.haltSale;
//         }
//         updatedEvent = await event.save();
//       });
//     }

//     if (!updatedEvent) {
//       return res.status(400).json({ msg: "Update operation failed" });
//     }

//     console.log(updatedEvent);
//     return res.status(200).json(updatedEvent);
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ msg: "Internal Server Error" });
//   }
// };
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const newChanges = req.body?.updates;
    const operation = req.body?.operation;

    const event = await eventSchema.findById(id);
    if (!event) {
      return res.status(404).json({ msg: "Event not found!" });
    }

    if (
      !(
        event.createdBy.userId === currentUser.userId ||
        event.staff.some(
          (user) =>
            user._id === currentUser.userId && user.role === "Administração"
        )
      )
    ) {
      return res.status(401).json({ msg: "Wrong User!" });
    }

    let updatedEvent;
    if (operation?.type === "eventStatus") {
      let updatedStaff = [...event.staff]; // Copy the array
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
      updatedEvent = await eventSchema.findByIdAndUpdate(
        id,
        { staff: updatedStaff },
        { new: true }
      );
    } else if (
      operation?.type === "ticketStatus" &&
      operation?.task === "halt"
    ) {
      event.tickets = event.tickets.map((ticket) => {
        if (ticket?.id == newChanges?.ticketId) {
          return { ...ticket, haltSale: !ticket.haltSale };
        }
        return ticket;
      });

      updatedEvent = await event.save();
    }

    if (!updatedEvent) {
      return res.status(400).json({ msg: "Update operation failed" });
    }

    return res.status(200).json(updatedEvent);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};


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
