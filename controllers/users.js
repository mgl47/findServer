const userSchema = require("../models/user");

const users = async (req, res) => {
  const { username } = req.query;


  try {
    const user = await userSchema.findOne({username});

    // const user = await userSchema.findOne({ username: search });
    if (!user) {
      return res.status(404).json({ msg: "User not Found" });
    }

    const userWithoutPassword = { ...user.toObject() };
    delete userWithoutPassword.password;
    // delete userWithoutPassword.userDescription;
    delete userWithoutPassword.purchasedTickets;

    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.log("Error retrieving users:", error);
    return res.status(500).json({ msg: "Error retrieving users" });
  }
};

module.exports = { users };
