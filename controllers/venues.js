const venuesSchema = require("../models/venue");

const nearbyVenues = async (req, res) => {
  const { long, lat, all } = req.query;
  try {
    let venues;

    let queryFilter = {};

    if (long && lat) {
      queryFilter.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [long, lat],
          },
          $maxDistance: 50000,
        },
      };
    }
    if (all == "true") {
      queryFilter.activeEvents = { $gte: 1 };
    }
    venues = await venuesSchema.find(queryFilter);
    return res.status(200).json(venues);
  } catch (error) {
    console.log(error);
    return res.status(401).json({ msg: "Error retrieving token" });
  }
};
const venues = async (req, res) => {
  const { filter } = req.query;

  const queryFilter = {};

  if (filter) {
    queryFilter.uuid = filter;
  }

  try {
    const venues = await venuesSchema.find(queryFilter);

    return res.status(200).json(venues);
  } catch (error) {
    console.log(error);
    return res.status(401).json({ msg: "Error retrieving token" });
  }
};

const searchVenues = async (req, res) => {
  const { search } = req.query;

  let aggregateStages = [
    {
      $search: {
        index: "venueSearch",
        text: {
          query: search,
          path: ["address.city", "address.zone", "displayName", "username"],
        },
      },
    },
    {
      $limit: 5,
    },

    {
      $project: {
        followers: 0,
        updatedAt: 0,
        createdBy: 0,
      },
    },
  ];
  try {
    const venues = await venuesSchema.aggregate(aggregateStages);

    return res.status(200).json(venues);
  } catch (error) {
    console.log("Error retrieving events:", error);
    return res.status(500).json({ msg: "Error retrieving events" });
  }
};

module.exports = { venues, nearbyVenues, searchVenues };
