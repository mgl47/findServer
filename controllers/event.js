const eventSchema = require("../models/event");
const venueSchema = require("../models/venue");
const userSchema = require("../models/user");
const purchaseSchema = require("../models/purchase");

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
    return res.status(200).json(event);
  } catch (error) {
    console.log("Error creating new event:", error);
    return res.status(500).json({ msg: "Error creating new event" });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const newChanges = req.body?.updates;
    const operation = req.body?.operation;

    const event = await eventSchema.findById(id);

    if (!event) {
      return res.status(404).json({ msg: "Event not found!" });
    }

    if (event.createdBy.userId !== user.userId) {
      return res.status(401).json({ msg: "Wrong User!" });
    }

    if (operation?.type === "eventAttendees" && operation?.task === "checkIn") {
      await checkInAttendee(event, newChanges);
    }
    if (operation?.type === "eventStatus" && operation?.task === "staff") {
      // console.log(newChanges);
      await event.updateOne({
        staff: newChanges?.newStaff,
        staffIds: newChanges?.newStaffId,
      });
    }

    // await event.updateOne(newChanges);

    return res.status(200).json({ msg: "Event updated!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

const checkInAttendee = async (event, changes) => {
  try {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    // Update event attendees
    const updatedAttendees = event.attendees.map((attendee) => {
      if (attendee.uuid === changes.ticketUser.uuid) {
        return {
          ...attendee,
          checkedIn: true,
          checkedAt: time,
          arrivalTime: now,
        };
      }
      return attendee;
    });
    await event.updateOne({ attendees: updatedAttendees });


    const purchase = await purchaseSchema.findOne({
      purchaseId: changes.ticketUser.purchaseId,
    });
    const updatedTickets = purchase.tickets.map((ticket) => {
      if (ticket.uuid === changes.ticketUser.uuid) {
        return {
          ...ticket,
          checkedIn: true,
          checkedAt: time,
          arrivalTime: now,
        };
      }
      return ticket;
    });
    await purchaseSchema.findOneAndUpdate(
      { purchaseId: changes.ticketUser.purchaseId },
      { $set: { tickets: updatedTickets } },
      { new: true }
    );
  } catch (error) {
    console.error("Error checking in attendee:", error);
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
