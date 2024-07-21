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
    const {
      user: currentUser,
      body: { updates: newChanges, operation },
    } = req;

    const event = await eventSchema.findById(id);
    if (!event) {
      return res.status(404).json({ msg: "Event not found!" });
    }

    const isAuthorized =
      event.createdBy.userId === currentUser.userId ||
      event.staff.some(
        (user) =>
          user._id === currentUser.userId && user.role === "Administração"
      );

    if (!isAuthorized) {
      return res.status(401).json({ msg: "Unauthorized user!" });
    }

    let updatedEvent;

    switch (operation?.type) {
      case "eventStatus":
        updatedEvent = await handleEventStatusOperation(
          event,
          operation.task,
          newChanges
        );
        break;
      case "ticketStatus":
        if (operation.task === "halt") {
          event.tickets = event.tickets.map((ticket) =>
            ticket.id == newChanges?.ticketId
              ? { ...ticket, haltSale: !ticket.haltSale }
              : ticket
          );
          updatedEvent = await event.save();
        }
        break;

      default:
        break;
    }

    if (!updatedEvent) {
      return res.status(400).json({ msg: "Update operation failed" });
    }

    return res.status(200).json(updatedEvent);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

const handleEventStatusOperation = async (event, task, newChanges) => {
  let updatedStaff = [...event.staff];
  switch (task) {
    case "addStaff":
      updatedStaff.push(newChanges?.newStaff);
      break;
    case "removeStaff":
      updatedStaff = updatedStaff.filter(
        (staff) => staff.uuid !== newChanges?.oldStaff?.uuid
      );
      break;
    case "updateStaff":
      updatedStaff = updatedStaff.map((staff) =>
        staff.uuid === newChanges?.uuid
          ? { ...staff, role: newChanges?.role }
          : staff
      );
      break;
    default:
      return null;
  }
  return eventSchema.findByIdAndUpdate(
    event.id,
    { staff: updatedStaff },
    { new: true }
  );
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
  const { userId, username } = req.user;
  const { eventId, attendees } = req.query;
  try {
    let event;

    if (attendees) {
      event = await eventSchema.findOne({
        _id: eventId,
        $or: [
          { "createdBy.username": username },
          { "organizers.username": username },
        ],
      });

      if (!event) {
        return res
          .status(404)
          .json({ msg: "Event not found or you do not have access" });
      }

      const attendees = await purchaseSchema.find({
        "event.eventId": eventId,
      });
      return res.status(200).json({ event, attendees });
    }
    event = await eventSchema.findById(eventId);

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
