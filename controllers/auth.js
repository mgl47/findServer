const mongoose = require("mongoose");
const userSchema = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const register = async (req, res) => {
  const { email, username } = req.body;

  const query = {
    $or: [{ username: username }, { email: email }],
  };

  try {
    const existingUser = await userSchema.findOne(query);

    if (existingUser) {
      if (existingUser.username === username) {
        return res
          .status(500)
          .json({ msg: "Nome de usuário não disponível!" });
      } else {
        return res
          .status(500)
          .json({ msg: "Este email já foi utilizado!" });
      }
    }

    const user = await userSchema.create({ ...req.body });
    const token = jwt.sign(
      { userId: user._id, username: username },
      JWT_SECRET,
      {}
    );

    return res.status(200).json({token,user});
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error registering the user" });
  }
};
const login = async (req, res) => {
  const { username, password } = req.body;

  const query = {
    $or: [{ username: username }, { email: username }],
  };
  try {
    const existingUser = await userSchema.findOne(query);

    if (existingUser) {
      const isMatch = await bcrypt.compare(password, existingUser.password);

      if (isMatch) {
        const token = jwt.sign(
          { userId: existingUser._id, username },
          JWT_SECRET,
          {}
        );
        return res.status(200).json({token,user:existingUser});
      }
      return res.status(500).json({ msg: "Palavra passe errada!" });
    }
    return res.status(500).json({ msg: "Este usuário não existe!" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "error getting the user" });
  }
};

module.exports = { login, register };
