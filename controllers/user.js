const userSchema = require("../models/user");
const eventSchema = require("../models/event");
const purchaseSchema = require("../models/purchase");
const venueSchema = require("../models/venue");

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { operation, amount, updates } = req.body;
  const currentUser = req.user;

  try {
    const user = await userSchema.findById(id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user._id != currentUser.userId) {
      return res.status(401).json({ msg: "Unauthorized: Wrong User" });
    }

    if (operation?.type === "profileChange" && operation?.task === "editing") {
      await updateUserProfile(id, updates);
      return res.status(200).json({ msg: "User profile updated" });
    }

    if (operation?.type === "follow") {
      if (operation?.task === "artist" || operation?.task === "venue") {
        await toggleFollow(req, res);
        return res.status(200).json({ msg: "User updated" });
      }
    }

    if (operation?.type === "accountBalance") {
      await updateUserBalance(id, operation, amount);
      return res.status(200).json({ msg: "User balance updated" });
    }

    if (operation?.type === "eventStatus") {
      addToEvent(req);
    }

  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};




const deleteAccount = async (req, res) => {};

const getInfo = async (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;
  try {
    const purchases = await purchaseSchema
      .find({ "buyer.userId": id })
      .sort({ createdAt: -1 });
    const events = await eventSchema.find({
      $or: [{ staffIds: id }, { "createdBy.userId": id }],
    });
    const user = await userSchema.findById(id);

    if (!user) {
      return res.status(404).json({ msg: "user not found!" });
    }

    if (user._id != currentUser.userId) {
      return res.status(401).json({ msg: "Wrong User!" });
    }
    const userWithoutPassword = { ...user.toObject() };
    delete userWithoutPassword.password;

    return res
      .status(200)
      .json({ user: userWithoutPassword, events, tickets: purchases });
  } catch (error) {
    console.log(error);
    return res.status(401).json({ msg: "Error retrieving token" });
  }
};

const updateUserProfile = async (userId, updates) => {
  await userSchema.findByIdAndUpdate(userId, updates);
};

const toggleFollow = async (req, res) => {
  const { id } = req.params;
  const { operation } = req.body;
  const targetModel = operation.task === "artist" ? userSchema : venueSchema;

  const target = await targetModel.findById(operation.target);
  const updatedFollowers = target?.followers || [];
  const index = updatedFollowers.indexOf(id);

  if (index !== -1) {
    updatedFollowers.splice(index, 1);
  } else {
    updatedFollowers.push(id);
  }

  await target.updateOne({ followers: updatedFollowers });
  await updateUserProfile(id, req.body.updates);
};

const updateUserBalance = async (userId, operation, amount) => {
  const updateAmount = operation.task === "topUp" ? amount : -amount;
  await userSchema.findByIdAndUpdate(userId, { $inc: { "balance.amount": updateAmount } });
};

const addToEvent = async (req, res) => {
  const operation = req.body?.operation;
  const currentUser = req.user;

  if (!operation || !operation.task || !operation.eventId) {
    return res.status(400).json({ msg: "Missing operation details" });
  }

  const selectedEvent = await eventSchema.findById(operation.eventId);
  if (!selectedEvent) {
    return res.status(404).json({ msg: "Event not found" });
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
    // if (selectedEvent.interestedUsers?.includes(currentUser.userId)) {
    //   const index = updateInterested.indexOf(currentUser.userId);
    //   if (index !== -1) {
    //     updateInterested.splice(index, 1); // Remove user from interested list
    //   }
    // }
    // const index = updateGoingUsers.indexOf(currentUser.userId);
    // if (index == -1) {
    //   updateGoingUsers.push(currentUser.userId); // add user to going list
    // }
    // const eventTicket = req.body.eventTicket;
    // let newAttendees = selectedEvent?.attendees;
    // newAttendees.push(...eventTicket?.tickets);
    // updateQuery = {
    //   goingUsers: updateGoingUsers,
    //   interestedUsers: updateInterested,
    //   attendees: newAttendees,
    //   tickets: req.body.updatedEventTickets,
    // };
  }

  try {
    await selectedEvent.updateOne({ $set: updateQuery }, { new: true });
  } catch (error) {
    console.log("Error updating event:", error);
  }
};


const registerArtist = async (req, res) => {
  const { email, username } = req.body.updates;
  console.log(username);

  const query = {
    $or: [{ username: username }, { email: email }],
  };

  try {
    // const existingUser = await userSchema.findOne(query);

    // if (existingUser) {
    //   if (existingUser.username === username) {
    //     return res.status(500).json({msg:"Nome de usuário não disponível!"});
    //   } else {
    //     return res.status(500).json({msg:"Este email já foi utilizado!"});
    //   }
    // }

    const user = await userSchema.create({ ...req.body.updates });
  

    return res.status(200).json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json({msg:"Error registering the user"});
  }
};
module.exports = { getInfo, updateUser, deleteAccount,registerArtist };
