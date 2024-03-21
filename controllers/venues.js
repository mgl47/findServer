const venuesSchema = require("../models/venue");

const venues = async (req, res) => {


  // const queryFilter={active:true}
  try {
    const venues = await venuesSchema.find({});

    return res.status(200).json(venues);
  } catch (error) {
    console.log(error);
    return res.status(401).json({ msg: "Error retrieving token" });
  }
};


module.exports = { venues };
