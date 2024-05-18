const userSchema = require("../models/user");

const users = async (req, res) => {
  const { username } = req.query;

  try {
    const user = await userSchema.findOne({ username });

    // const user = await userSchema.findOne({ username: search });
    if (!user) {
      return res.status(404).json({ msg: "User not Found" });
    }

    const userWithoutPassword = { ...user.toObject() };
    delete userWithoutPassword.password;
    // delete userWithoutPassword.userDescription;
    delete userWithoutPassword.purchasedTickets;

    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.log("Error retrieving users:", error);
    return res.status(500).json({ msg: "Error retrieving users" });
  }
};

const searchUsers = async (req, res) => {
  const { search } = req.query;

  let aggregateStages = [
    {
      $search: {
        index: "userSearch",
        text: {
          query: search,
          path: ["displayName", "username", "userDescription"],
          // path: "title",
        },
      },
    },
    {
      $limit: 5,
    },

    {
      $project: {
        goingToEvents: 0,
        likedEvents: 0,
        password: 0,
        balance: 0,
        followedVenues: 0,
        updatedAt: 0,
        updatedAt: 0,
        updatedAt: 0,
      },
    },
  ];
  try {
    const users = await userSchema.aggregate(aggregateStages);
    console.log(users);

    return res.status(200).json(users);
  } catch (error) {
    console.log("Error retrieving events:", error);
    return res.status(500).json({ msg: "Error retrieving events" });
  }
};

module.exports = { users, searchUsers };
