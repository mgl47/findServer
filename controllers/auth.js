const mongoose = require("mongoose");
const userSchema = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const register = async (req, res) => {
  const { password, email, userName } = req.body;

  const query = {
    $or: [{ userName: userName }, { email: email }],
  };

  try {
    const existingUser = await userSchema.findOne(query);

    if (existingUser) {
      if (existingUser.userName === userName) {
        return res
          .status(500)
          .json({ msg: "Another user is already using this username" });
      } else {
        return res
          .status(500)
          .json({ msg: "Another user is already using this email" });
      }
    }

    const user = await userSchema.create({ ...req.body });
    const token = jwt.sign({ userId: user._id, userName }, JWT_SECRET, {});

    return res.status(200).json(token);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error registering the user" });
  }
};
const login = async (req, res) => {
  const { userName, password } = req.body;

  const query = {
    $or: [{ userName: userName }, { email: userName }],
  };
  try {
    const existingUser = await userSchema.findOne(query);
    console.log(existingUser);

    if (existingUser) {
      const isMatch = await bcrypt.compare(password, existingUser.password);

      if (isMatch) {
        const token = jwt.sign(
          { userId: existingUser._id, userName },
          JWT_SECRET,
          {}
        );
        return res.status(200).json(token);
      }
      return res.status(500).json({ msg: "Invalid password" });
    }
    return res.status(404).json({ msg: "this user doesn't exist" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "error getting the user" });
  }
};

module.exports = { login, register };
