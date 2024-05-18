const eventSchema = require("../models/event");

const events = async (req, res) => {
  const { venue, artist, date, category } = req.query;


  let queryFilter = {};
  if (venue) {
    queryFilter["venue.uuid"] = venue;
  }

  if (category) {
    queryFilter.category = category;
  }

  if (artist) {
    queryFilter = {
      $or: [
        { "artists.uuid": artist },
        { "createdBy.uuid": artist },
        { "organizers.uuid": artist },
      ],
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

const searchEvents = async (req, res) => {
  const { search } = req.query;

  let aggregateStages = [
    {
      $search: {
        index: "eventSearch",
        text: {
          query: search,
          path: [
            "title",
            "description",
            "artists.displayName",
            "organizers.displayName",
          ],
          // path: "title",
        },
      },
    },
    {
      $limit: 5,
    },

    {
      $project: {
        interestedUsers: 0,
        goingUsers: 0,
        attendees: 0,
        staff: 0,
      },
    },
  ];
  try {
    const events = await eventSchema.aggregate(aggregateStages);

    return res.status(200).json(events);
  } catch (error) {
    console.log("Error retrieving events:", error);
    return res.status(500).json({ msg: "Error retrieving events" });
  }
};

module.exports = { events, searchEvents };
