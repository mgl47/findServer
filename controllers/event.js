const eventSchema = require("../models/event");
const venueSchema = require("../models/venue");
const createVenue = async (req, res) => {
  const user = req.user;
  console.log(req.body);
  const newVenue = {
    ...req.body,
    createdBy: user.userId,
  };

  // const queryFilter=
  try {
    const venue = await venueSchema.create(newVenue);

   return res.status(200).json(venue);
  } catch (error) {
    console.log(error);
    return res.status(401).json({ msg: "Error retrieving token" });
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
    console.log(error);
    res.status(500).json({ message: "error creating new event" });
  }
};

const updateEvent = async (req, res) => {
  const { id } = req.params;
  const newChanges = req.body;
  const user = req.user;
  console.log(user);
  try {
    const event = await eventSchema.findById(id);
    if (event) {
      if (event.createdBy.userId == user.userId) {
        await event.updateOne(newChanges);
        return res.status(200).json({ msg: "Event updated!" });
      }
      return res.status(401).json({ msg: "Wrong User!" });
    }
    return res.status(404).json({ msg: "Event not found!" });
  } catch (error) {
    console.log(error);
    return res.status(401).json({ msg: "Error retrieving token" });
  }
};

const deleteEvent = async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  try {
    const event = await eventSchema.findById(id);
    if (event) {
      if (event.createdBy.userId == user.userId) {
        await event.deleteOne();
        return res.status(200).json({ msg: "Event deleted!" });
      }
      return res.status(401).json({ msg: "Wrong User!" });
    }
    return res.status(404).json({ msg: "Event not found!" });
  } catch (error) {
    console.log(error);
    return res.status(401).json({ msg: "Error retrieving token" });
  }
};

const creaasteEvent = async (req, res) => {};

const creassateEvent = async (req, res) => {};

module.exports = { createEvent, deleteEvent, updateEvent, createVenue };
