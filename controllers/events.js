const eventSchema = require("../models/event");

const events = async (req, res) => {


  // const queryFilter={active:true}
  try {
    const events = await eventSchema.find({});

    return res.status(200).json(events);
  } catch (error) {
    console.log(error);
    return res.status(401).json({ msg: "Error retrieving token" });
  }
};


module.exports = { events };
