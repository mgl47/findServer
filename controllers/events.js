const eventSchema = require("../models/event");

const events = async (req, res) => {
  const { venue, artist, date } = req.query;

  let queryFilter = {};

  if (venue) {
    queryFilter["venue.uuid"] = venue;
  }
  console.log(artist);
  // queryFilter["artists.uuid"] = artist;

  if (artist) {
    queryFilter = {
      $or: [{ "artists.uuid": artist }, { "createdBy.uuid": artist },{"organizers.uuid": artist }],
    };
  }

  if (date) {
    queryFilter["dates.calendarDate"] = date;
  }

  try {
    const events = await eventSchema.find(queryFilter).sort({ createdAt: -1 });
    return res.status(200).json(events);
  } catch (error) {
    console.log("Error retrieving events:", error);
    return res.status(500).json({ msg: "Error retrieving events" });
  }
};

module.exports = { events };
