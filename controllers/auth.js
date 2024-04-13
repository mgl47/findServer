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
        return res.status(500).json({msg:"Nome de usuário não disponível!"});
      } else {
        return res.status(500).json({msg:"Este email já foi utilizado!"});
      }
    }

    const user = await userSchema.create({ ...req.body });
    const token = jwt.sign(
      { userId: user._id, username: username },
      JWT_SECRET,
      {}
    );

    return res.status(200).json({ token, user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({msg:"Error registering the user"});
  }
};
const login = async (req, res) => {
  const { username, password } = req.body;

  const query = {
    $or: [{ username: username }, { email: username }],
  };

  try {
    const existingUser = await userSchema.findOne(query);

    if (!existingUser) {
      return res.status(500).json({msg:"Este usuário não existe!"});
    }

    const isMatch = await bcrypt.compare(password, existingUser.password);

    if (!isMatch) {
      return res.status(500).json({msg:"Palavra passe errada!"});
    }

    const token = jwt.sign(
      { userId: existingUser._id, username },
      JWT_SECRET,
      {}
    );

    // Avoid sending the user's password in the response
    const userWithoutPassword = { ...existingUser.toObject() };
    delete userWithoutPassword.password;

    return res.status(200).json({ token, user: userWithoutPassword });
  } catch (error) {
    console.log("Error logging in:", error);
    return res.status(500).json({msg:"Error logging in"});
  }
};

module.exports = { login, register };
