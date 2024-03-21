const userSchema = require("../models/user");

const likeEvent = async (req, res) => {
  const { id } = req.params;
  const newChanges = req.body;
  const user = req.user;
  console.log(user);
  //   try {
  //     const user = await userSchema.findById(id);
  //     if (user) {
  //       if (user.createdBy.userId == user.userId) {
  //         await user.updateOne(newChanges);
  //         return res.status(200).json({ msg: "user updated!" });
  //       }
  //       return res.status(401).json({ msg: "Wrong User!" });
  //     }
  //     return res.status(404).json({ msg: "user not found!" });
  //   } catch (error) {
  //     console.log(error);
  //     return res.status(401).json({ msg: "Error retrieving token" });
  //   }
};

// const likeUser = async (req, res) => {
//   const { id } = req.params;
//   const newChanges = req.body;
//   const user = req.user;
//   console.log(user);
//   try {
//     const user = await userSchema.findById(id);
//     if (user) {
//       if (user.createdBy.userId == user.userId) {
//         await user.updateOne(newChanges);
//         return res.status(200).json({ msg: "user updated!" });
//       }
//       return res.status(401).json({ msg: "Wrong User!" });
//     }
//     return res.status(404).json({ msg: "user not found!" });
//   } catch (error) {
//     console.log(error);
//     return res.status(401).json({ msg: "Error retrieving token" });
//   }
// };

// const likeVenue = async (req, res) => {};
const updateUser = async (req, res) => {
  const { id } = req.params;
  const newChanges = req.body;
  const user = req.user;
  //   console.log(user);
  try {
    const currentUser = await userSchema.findById(id);
    if (currentUser) {
      if (currentUser._id == user.userId) {
        await currentUser.updateOne(newChanges);
        console.log(newChanges);

        return res.status(200).json({ msg: "user updated!" });
      }
      return res.status(401).json({ msg: "Wrong User!" });
    }
    return res.status(404).json({ msg: "user not found!" });
  } catch (error) {
    console.log(error);
    return res.status(401).json({ msg: "Error retrieving token" });
  }
};

const deleteAccount = async (req, res) => {};

const getInfo = async (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;
  //   console.log(user?._id);
  try {
    const user = await userSchema.findById(id);
    if (user) {
      if (user._id == currentUser.userId) {
        // await user.updateOne(newChanges);
        return res.status(200).json(user);
      }
      return res.status(401).json({ msg: "Wrong User!" });
    }
    return res.status(404).json({ msg: "user not found!" });
  } catch (error) {
    console.log(error);
    return res.status(401).json({ msg: "Error retrieving token" });
  }
};

module.exports = { getInfo, updateUser, deleteAccount };
