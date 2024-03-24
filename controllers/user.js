const userSchema = require("../models/user");
const eventSchema = require("../models/event");





// const likeVenue = async (req, res) => {};
const updateUser = async (req, res) => {
  const { id } = req.params;
  const newChanges = req.body?.updates;
  const operation = req.body?.operation;
  const user = req.user;
  console.log(req.params)

  try {
    const currentUser = await userSchema.findById(id);
    if (currentUser) {
      if (currentUser._id == user.userId) {
        await currentUser.updateOne(newChanges);
        if (operation?.type == "eventStatus") {
          addToEvent(req);
        }
        // console.log(operation?.type);

        return res.status(200).json({ msg: "user updated!" });
      }
      return res.status(401).json({ msg: "Wrong User!" });
    }
    return res.status(200).json({ msg: "user not found!" });
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

const addToEvent = async (req, res) => {
  const operation = req.body?.operation;
  const currentUser = req.user;

  if (!operation || !operation.task || !operation.eventId) {
    return;
  }

  const selectedEvent = await eventSchema.findById(operation.eventId);

  if (!selectedEvent) {
    return;
  }

  let updateQuery = {};
  let updateInterested = [];
  let updateGoingUsers = [];
  updateInterested = selectedEvent.interestedUsers || [];
  updateGoingUsers = selectedEvent.goingUsers || [];

  if (operation.task === "interest") {
    const index = updateInterested.indexOf(currentUser.userId);
    if (index !== -1) {
      updateInterested.splice(index, 1); // Remove user from interested list
    } else {
      updateInterested.push(currentUser.userId); // Add user to interested list

      if (selectedEvent.goingUsers?.includes(Event?._id)) {
        const index = updateGoingUsers.indexOf(Event?._id);
        if (index !== -1) {
          // setGoing(false);
          updateGoingUsers.splice(index, 1);
        }
      }
    }
    // updateQuery = { interestedUsers: updateInterested };
  } else if (operation.task === "going") {
    const index = updateGoingUsers.indexOf(currentUser.userId);
    if (index !== -1) {
      console.log("going");

      updateGoingUsers.splice(index, 1); // Remove user from going list
    } else {
      updateGoingUsers.push(currentUser.userId);

      if (selectedEvent.interestedUsers?.includes(Event?._id)) {
        const index = updateInterested.indexOf(Event?._id);
        if (index !== -1) {
          // setGoing(false);
          updateInterested.splice(index, 1);
        }
      }
    }
    // updateQuery = { goingUsers: updateGoingUsers };
  }
  updateQuery = {
    goingUsers: updateGoingUsers,
    interestedUsers: updateInterested,
  };
  try {
    await eventSchema.findOneAndUpdate(
      { _id: operation.eventId },
      { $set: updateQuery },
      { new: true }
    );
  } catch (error) {
    console.error("Error updating event:", error);
  }
};

module.exports = { getInfo, updateUser, deleteAccount };
