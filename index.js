const express = require("express");
const mongoose = require("mongoose");
const jwt = require('jsonwebtoken');
require('express-async-errors');

require("dotenv").config();
const connect = require("./DB/connect");
const PORT = 9000;
const dbURl = process.env.DB_URL;
const app = express();
//Routers
const authRouter=require("./Routes/auth")
const userRouter=require("./Routes/user")
const authenticateUser = require('./middlewares/user');

app.use(express.json());

app.use("/api/auth",authRouter)
app.use("/api/user",authenticateUser,userRouter)

// app.get("/", (req, res) => {
//   res.send("Up");
// });





const start = async () => {
  try {
    await connect(dbURl);
    app.listen(PORT || 9000, () => {
      console.log("listening on port " + PORT);
    });
  } catch (error) {}
};
start();
