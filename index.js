const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const sendEmail = require("./controllers/sendEmail");
require("express-async-errors");

require("dotenv").config();
const connect = require("./DB/connect");
const PORT = 9000;
const dbURl = process.env.DB_URL;
const app = express();
//Routers
const eventsRouter= require("./routes/events");
const venuesRouter= require("./routes/venues");

const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const authenticateUser = require("./middlewares/user");
app.use(cors());
app.use(express.json());

app.use("/api/events", eventsRouter);
app.use("/api/venues", venuesRouter);


app.use("/api/auth", authRouter);
app.use("/api/user", authenticateUser, userRouter);

// app.get('/send', sendEmail);

const start = async () => {
  try {
    await connect(dbURl);
    app.listen(PORT || 9000, () => {
      console.log("listening on port " + PORT);
    });
  } catch (error) {}
};
start();
