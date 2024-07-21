const userSchema = require("../models/user");

const users = async (req, res) => {
  const { username } = req.query;

  try {
    const user = await userSchema
      .findOne({ username })
      .select([
        "-goingToEvents",
        "-likedEvents",
        "-password",
        "-balance",
        "-followedVenues",
        "-followedArtists",
        "-updatedAt",
      ]);

    // const user = await userSchema.findOne({ username: search });
    if (!user) {
      return res.status(404).json({ msg: "User not Found" });
    }

    // const userWithoutPassword = { ...user.toObject() };
    // delete userWithoutPassword.password;
    // // delete userWithoutPassword.userDescription;
    // delete userWithoutPassword.purchasedTickets;

    return res.status(200).json(user);
  } catch (error) {
    console.log("Error retrieving users:", error);
    return res.status(500).json({ msg: "Error retrieving users" });
  }
};

const searchUsers = async (req, res) => {
  const { search } = req.query;

  // Aggregate pipeline
  const aggregateStages = [
    {
      $search: {
        index: "userSearch",
        text: {
          query: search,
          path: ["displayName", "username", "userDescription"],
        },
      },
    },
    {
      $match: {
        $or: [{ "status.isOrganizer": true }, { "status.isArtist": true }],
      },
    },
    {
      $project: {
        goingToEvents: 0,
        likedEvents: 0,
        password: 0,
        balance: 0,
        followedVenues: 0,
        updatedAt: 0, // Only needed once
      },
    },
    {
      $limit: 5,
    },
  ];

  try {
    const users = await userSchema.aggregate(aggregateStages).exec();

    return res.status(200).json(users);
  } catch (error) {
    console.log("Error retrieving users:", error);
    return res.status(500).json({ msg: "Error retrieving users" });
  }
};


module.exports = { users, searchUsers };
