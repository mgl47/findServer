const mongoose = require("mongoose");
const userSchema = require("../Models/user");

const login = async (req, res) => {
  const { userName, password } = req.body;

  const queryObj = { userName: userName };
  console.log(userName);

  try {
    const user = await userSchema.find(queryObj).then((user) => {
      res.status(200).json(user);
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "error getting the user" });
  }
};

const register = async (req, res) => {
  const user = req.body;

  const queryObj = { userName: user.userName };
  console.log(user);
  try {
    await userSchema.find(queryObj).then((user) => {
      if (user?.length > 0) {
        return res
          .status(500)
          .json({ msg: "Another user is already using these credentials" });
      }
      userSchema.create(user);
      res.status(200).json({ message: "new user created" });
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "error registering the user" });
  }
};

module.exports = { login, register };
