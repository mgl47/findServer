const eventSchema = require("../models/event");

const events = async (req, res) => {
  try {
    const events = await eventSchema.find({});
    return res.status(200).json(events);
  } catch (error) {
    console.log("Error retrieving events:", error);
    return res.status(500).json({ msg: "Error retrieving events" });
  }
};


module.exports = { events };
