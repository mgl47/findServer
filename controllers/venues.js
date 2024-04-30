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
    if (all=="true") {
      console.log("jkhjghfx");
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
  const { filter, island } = req.query;
  const queryFilter = {};

  if (filter) {
    queryFilter.uuid = filter;
  }

  try {
    let venues;
    // if (island) {
    //   venues = await venuesSchema.find({
    //     $and: [queryFilter, island && { "address.island.code": island }],
    //   });
    // } else {
    venues = await venuesSchema.find(queryFilter);
    // }
    // console.log(venues);

    return res.status(200).json(venues);
  } catch (error) {
    console.log(error);
    return res.status(401).json({ msg: "Error retrieving token" });
  }
};

module.exports = { venues, nearbyVenues };
