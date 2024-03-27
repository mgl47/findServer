const userSchema = require("../models/user");

const users = async (req, res) => {
  console.log(req.query);
  const { filter, search } = req.query;

  try {
    const user = await userSchema.findOne({ username: search });
    const userWithoutPassword = { ...user.toObject() };
    delete userWithoutPassword.password;
    delete userWithoutPassword.userDescription;
    delete userWithoutPassword.purchasedTickets;

    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Error retrieving users:", error);
    return res.status(500).json({ message: "Error retrieving users" });
  }
};

module.exports = { users };
