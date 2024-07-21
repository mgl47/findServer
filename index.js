const express = require("express");
const cors = require("cors");

// const sendEmail = require("./controllers/sendEmail");
require("express-async-errors");

require("dotenv").config();
const connect = require("./DB/connect");
const PORT = 9000;
const dbURl = process.env.DB_URL;
const app = express();
//Routers

const userRouter = require("./routes/user");
const usersRouter = require("./routes/users");

const eventsRouter = require("./routes/events");
const venuesRouter = require("./routes/venues");
const authRouter = require("./routes/auth");
const authenticateUser = require("./middlewares/user");
const purchaseRouter = require("./routes/purchase");
app.use(cors());
app.use(express.json());

app.use("/api/users", usersRouter);
app.use("/api/events", eventsRouter);
app.use("/api/venues", venuesRouter);
app.use("/api/auth", authRouter);
app.use("/api/user", authenticateUser, userRouter);
app.use("/api/purchase", authenticateUser, purchaseRouter);
app.get("/l/:id/l", async (req, res) => {
  const id = req.params.id;
  console.log(req.headers["user-agent"]);

  // Redirect to the Expo link with a delay before redirecting to Google

  // Veja esse anúncio de Assessoria Contábil no dtudo:
  // https://dtudo.net/l/96cd1f8e-9b72-471c-a9c8-fbdf3f61be9d/l
  
  // Se ainda não tens o dtudo instalado, podes obtê-lo apartir desses links:
  // android: https://play.google.com/store/apps/details?id=com.dtudoFcm.app 
  // ios: https://apps.apple.com/app/id6449946524
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redirecting...</title>
      <script>
        setTimeout(() => {
          window.location.href = 'https://apps.apple.com/app/id6449946524';
        }, 2000);
      </script>
    </head>
    <body>
      <script>
        window.location.href = 'dtudo://l/96cd1f8e-9b72-471c-a9c8-fbdf3f61be9d/l';
      </script>
      <p>Redirecting, please wait...</p>
    </body>
    </html>
  `);
});


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
