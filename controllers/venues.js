const venuesSchema = require("../models/venue");

const venues = async (req, res) => {
  const { filter, island } = req.query;
  const queryFilter = {};

  if (filter) {
    queryFilter.uuid = filter;
  }

  console.log(queryFilter);

  try {
    let venues;
    if (island) {
      venues = await venuesSchema.find({
        $and: [queryFilter, island && { "address.island.code": island }],
      });
    } else {
      venues = await venuesSchema.find(queryFilter);
    }
    console.log(venues);

    return res.status(200).json(venues);
  } catch (error) {
    console.log(error);
    return res.status(401).json({ msg: "Error retrieving token" });
  }
};

module.exports = { venues };
