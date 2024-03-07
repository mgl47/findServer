const mongoose = require("mongoose");
const userSchema = require("../Models/user");

const login = async (req, res) => {
  const { userName, password } = req.body;

  const queryObj = { userName: userName,password:password };
  console.log(userName);

  try {
    await userSchema.find(queryObj).then((user) => {
      res.status(200).json({user,msg:"Welcome back "+userName});
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "error getting the user" });
  }
};

const register = async (req, res) => {
    const newUser = req.body;
    
    const query = {
      $or: [
        { userName: newUser.userName },
        { email: newUser.email }
      ]
    };
  
    try {
      const existingUser = await userSchema.findOne(query);
  
      if (existingUser) {
        if (existingUser.userName === newUser.userName) {
          return res.status(500).json({ msg: "Another user is already using this username" });
        } else {
          return res.status(500).json({ msg: "Another user is already using this email" });
        }
      }
  
      await userSchema.create(newUser);
      return res.status(200).json({ message: "New user created" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error registering the user" });
    }
  };
  

module.exports = { login, register };
