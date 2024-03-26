const eventSchema = require("../models/event");
const venueSchema = require("../models/venue");
const userSchema = require("../models/user");

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
    console.error("Error creating new venue:", error);
    return res.status(500).json({ message: "Error creating new venue" });
  }
};

const createEvent = async (req, res) => {
  const user = req.user;

  const newEvent = {
    ...req.body,
    createdBy: { ...req.body.createdBy, userId: user.userId },
  };

  try {
    const event = await eventSchema.create(newEvent);
    return res.status(200).json(event);
  } catch (error) {
    console.error("Error creating new event:", error);
    return res.status(500).json({ message: "Error creating new event" });
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

    // Update other fields if needed
    // await event.updateOne(newChanges);

    return res.status(200).json({ msg: "Event updated!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

const checkInAttendee = async (event, newChanges) => {
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
  const newAttendees = event.attendees.map((item) => {
    if (item.uuid === newChanges?.ticketUser?.uuid) {
      return {
        ...item,
        checkedIn: true,
        checkedAt: time,
        arrivalTime: now,
      };
    }
    return item;
  });
  await event.updateOne({ attendees: newAttendees });
  const user = await userSchema.findOne({
    username: newChanges?.ticketUser?.username,
  });
//Update ticket in user's purchased Tickets
  const updatedPurchases = user.purchasedTickets.map((purchases) => {
    const newTickets = purchases?.tickets?.map((item) => {
      if (item?.uuid == newChanges?.ticketUser?.uuid) {

        return { ...item, checkedIn: true, checkedAt: time, arrivalTime: now };
      } else return { ...item };
    });

    return { ...purchases, tickets: newTickets };
  });
  await user.updateOne({ purchasedTickets: updatedPurchases });
};

const getMyEvents = async (req, res) => {
  try {
    const currentUser = req.user;

    const events = await eventSchema.find({ creatorId: currentUser?.userId });

    return res.status(200).json(events);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Internal Server Error" });
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
};
