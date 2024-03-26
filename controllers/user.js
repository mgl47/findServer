const userSchema = require("../models/user");
const eventSchema = require("../models/event");

// const likeVenue = async (req, res) => {};
const updateUser = async (req, res) => {
  const { id } = req.params;
  let newChanges = req.body?.updates;
  const operation = req.body?.operation;
  const currentUser = req.user;
  const eventTicket = req?.body?.eventTicket;

  try {
    const user = await userSchema.findById(id);
    if (user) {
      if (user._id == currentUser.userId) {
        if (operation.task === "purchase") {
          let newTicket = user?.purchasedTickets;
          newTicket.push(eventTicket);
          // console.log(newTicket);
          newChanges = { ...newChanges, purchasedTickets: newTicket };
        }

        await user.updateOne(newChanges);

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

  try {
    const user = await userSchema.findById(id);

    if (!user) {
      return res.status(404).json({ msg: "user not found!" });
    }

    if (user._id != currentUser.userId) {
      return res.status(401).json({ msg: "Wrong User!" });
    }
    const userWithoutPassword = { ...user.toObject() };
    delete userWithoutPassword.password;
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.log(error);
    return res.status(401).json({ msg: "Error retrieving token" });
  }
};

const addToEvent = async (req, res) => {
  const operation = req.body?.operation;
  const currentUser = req.user;

  if (!operation || !operation.task || !operation.eventId) {
    return res.status(400).json({ error: "Missing operation details" });
  }

  const selectedEvent = await eventSchema.findById(operation.eventId);
  if (!selectedEvent) {
    return res.status(404).json({ error: "Event not found" });
  }

  let updateQuery = {};
  let updateInterested = [...selectedEvent.interestedUsers];
  let updateGoingUsers = [...selectedEvent.goingUsers];

  if (operation.task === "interest" || operation.task === "going") {
    const targetArray =
      operation.task === "interest" ? updateInterested : updateGoingUsers;
    const index = targetArray.indexOf(currentUser.userId);
    if (index !== -1) {
      targetArray.splice(index, 1); // Remove user from the list
    } else {
      targetArray.push(currentUser.userId); // Add user to the list
      if (
        operation.task === "interest" &&
        updateGoingUsers.includes(currentUser.userId)
      ) {
        const goingIndex = updateGoingUsers.indexOf(currentUser.userId);
        updateGoingUsers.splice(goingIndex, 1);
      } else if (
        operation.task === "going" &&
        updateInterested.includes(currentUser.userId)
      ) {
        const interestIndex = updateInterested.indexOf(currentUser.userId);
        updateInterested.splice(interestIndex, 1);
      }
    }
    updateQuery = {
      goingUsers: updateGoingUsers,
      interestedUsers: updateInterested,
    };
  } else if (operation.task === "purchase") {
    if (selectedEvent.interestedUsers?.includes(currentUser.userId)) {
      const index = updateInterested.indexOf(currentUser.userId);
      if (index !== -1) {
        updateInterested.splice(index, 1); // Remove user from interested list
      }
    }
    const index = updateGoingUsers.indexOf(currentUser.userId);
    if (index == -1) {
      updateGoingUsers.push(currentUser.userId); // add user to going list
    }
    const eventTicket = req.body.eventTicket;
    let newAttendees = selectedEvent?.attendees;
    newAttendees.push(...eventTicket?.tickets);

    updateQuery = {
      goingUsers: updateGoingUsers,
      interestedUsers: updateInterested,
      attendees: newAttendees,
    };
  }

  try {
    await selectedEvent.updateOne({ $set: updateQuery }, { new: true });
  } catch (error) {
    console.error("Error updating event:", error);
  }
};

module.exports = { getInfo, updateUser, deleteAccount };
