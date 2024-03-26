const eventSchema = require("../models/event");

const events = async (req, res) => {
  try {
    const events = await eventSchema.find({});
    return res.status(200).json(events);
  } catch (error) {
    console.error("Error retrieving events:", error);
    return res.status(500).json({ message: "Error retrieving events" });
  }
};


module.exports = { events };
