const userSchema = require("../models/user");
const eventSchema = require("../models/event");
const purchaseSchema = require("../models/purchase");
const venueSchema = require("../models/venue");

// Function to update user profile
const updateUserProfile = async (userId, updates) => {
   await userSchema.findByIdAndUpdate(userId, updates, { new: true });
   
};

// Function to toggle follow status for artists and venues
const toggleFollow = async (req, res) => {
  const { id } = req.params; // User ID
  const { operation } = req.body; // Operation details

  const targetModel = operation.task === "artist" ? userSchema : venueSchema; // Determine target model based on task

  try {
    const target = await targetModel.findById(operation.target); // Find target artist or venue
    if (!target) {
      return res.status(404).json({ msg: `${operation.task} not found` });
    }

    const updatedFollowers = target.followers || []; // Initialize followers array if not present
    const index = updatedFollowers.indexOf(id); // Find index of user in followers array

    if (index !== -1) {
      updatedFollowers.splice(index, 1); // Remove user from followers if already following
    } else {
      updatedFollowers.push(id); // Add user to followers if not already following
    }

    await target.updateOne({ followers: updatedFollowers }); // Update followers array in the target document
    await updateUserProfile(id, req.body.updates); // Update user profile with additional updates

    return res.status(200).json({ msg: "Follow status updated" });
  } catch (error) {
    console.error("Error toggling follow:", error);
    return res.status(500).json({ msg: "Error updating follow status" });
  }
};

// Function to update user balance
const updateUserBalance = async (userId, operation, amount) => {
  const updateAmount = operation.task === "topUp" ? amount : -amount; // Determine amount to add or subtract
  return await userSchema.findByIdAndUpdate(
    userId,
    { $inc: { "balance.amount": updateAmount } },
    { new: true }
  );
};

// Function to add user to event's interested or going list
const addToEvent = async (req, res) => {
  const { operation } = req.body; // Operation details
  const currentUser = req.user; // Current user details

  if (!operation || !operation.task || !operation.eventId) {
    return res.status(400).json({ msg: "Missing operation details" });
  }

  try {
    const selectedEvent = await eventSchema.findById(operation.eventId); // Find the event by ID
    if (!selectedEvent) {
      return res.status(404).json({ msg: "Event not found" });
    }

    let updateQuery = {};
    let updateInterested = [...selectedEvent.interestedUsers]; // Copy of interested users
    let updateGoingUsers = [...selectedEvent.goingUsers]; // Copy of going users

    if (operation.task === "interest" || operation.task === "going") {
      const targetArray =
        operation.task === "interest" ? updateInterested : updateGoingUsers; // Determine target array based on task
      const index = targetArray.indexOf(currentUser.userId); // Find index of current user in target array
      if (index !== -1) {
        targetArray.splice(index, 1); // Remove user from target array if already present
      } else {
        targetArray.push(currentUser.userId); // Add user to target array if not present
        // Ensure user is not in both lists
        if (operation.task === "interest" && updateGoingUsers.includes(currentUser.userId)) {
          const goingIndex = updateGoingUsers.indexOf(currentUser.userId);
          updateGoingUsers.splice(goingIndex, 1);
        } else if (operation.task === "going" && updateInterested.includes(currentUser.userId)) {
          const interestIndex = updateInterested.indexOf(currentUser.userId);
          updateInterested.splice(interestIndex, 1);
        }
      }
      updateQuery = {
        goingUsers: updateGoingUsers,
        interestedUsers: updateInterested,
      };
    }

    await selectedEvent.updateOne({ $set: updateQuery }, { new: true }); // Update event with new lists
    // return res.status(200).json({ msg: "Event updated" }); 
  } catch (error) {
    console.error("Error updating event:", error);
    return res.status(500).json({ msg: "Error updating event" });
  }
};

// Controller function to handle user updates
const updateUser = async (req, res) => {
  const { id } = req.params; // User ID
  const { operation, amount, updates } = req.body; // Operation details
  const currentUser = req.user; // Current user details

  try {
    const user = await userSchema.findById(id); // Find user by ID
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user._id.toString() !== currentUser.userId) {
      return res.status(401).json({ msg: "Unauthorized: Wrong User" });
    }

    // Handle different operation types
    switch (operation?.type) {
      case "profileChange":
        if (operation?.task === "editing") {
          await updateUserProfile(id, updates);
          return res.status(200).json({ msg: "User profile updated" });
        }
        break;
      case "follow":
        if (operation?.task === "artist" || operation?.task === "venue") {
          await toggleFollow(req, res);
          return; // Ensure no further response is sent
        }
        break;
      case "accountBalance":
        await updateUserBalance(id, operation, amount);
        return res.status(200).json({ msg: "User balance updated" });
      case "eventStatus":
        await addToEvent(req, res);
        await updateUserProfile(id, updates);
        return res.status(200).json({ msg: "User updated" });
      default:
        return res.status(400).json({ msg: "Invalid operation type" });
    }
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

// Controller function to get user info
const getInfo = async (req, res) => {
  const { field } = req.query; // Requested field
  const currentUser = req.user; // Current user details

  if (!currentUser) {
    return res.status(401).json({ msg: "Unauthorized user!" });
  }

  try {
    const user = await userSchema.findById(currentUser.userId); // Find user by ID
    if (!user) {
      return res.status(404).json({ msg: "User not found!" });
    }

    if (user._id.toString() !== currentUser.userId) {
      return res.status(401).json({ msg: "Unauthorized user!" });
    }

    const userWithoutPassword = { ...user.toObject() }; // Convert user to plain object and remove password
    delete userWithoutPassword.password;

    const response = { user: userWithoutPassword };

    // Retrieve different user info based on the requested field
    if (!field || field === "all" || field === "myEvents") {
      response.myEvents = await eventSchema
        .find({
          $or: [
            { "staff._id": currentUser.userId },
            { "createdBy.userId": currentUser.userId },
          ],
        })
        .sort({ createdAt: -1 });
    }

    if (!field || field === "all" || field === "myTickets") {
      response.tickets = await purchaseSchema
        .find({ "user.endUser.userId": currentUser.userId })
        .sort({ createdAt: -1 });
    }

    if (!field || field === "all" || field === "favEvents") {
      const allEvents = await eventSchema.find();
      response.favEvents = allEvents.filter(
        (event) =>
          user.likedEvents.includes(event._id) ||
          user.goingToEvents.includes(event._id)
      );
    }

    if (!field || field === "all" || field === "favVenues") {
      response.favVenues = await venueSchema.find({
        _id: { $in: user.followedVenues },
      });
    }

    if (!field || field === "all" || field === "favArtists") {
      response.favArtists = await userSchema.find({
        _id: { $in: user.followedArtists },
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error retrieving user info:", error);
    return res.status(500).json({ msg: "Error retrieving user info" });
  }
};

// Placeholder function for deleting account
const deleteAccount = async (req, res) => {
  // Implement account deletion logic here
};

// Controller function to register a new artist
const registerArtist = async (req, res) => {
  const { email, username } = req.body.updates;

  const query = {
    $or: [{ username }, { email }],
  };

  try {
    const existingUser = await userSchema.findOne(query);

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ msg: "Username not available!" });
      } else {
        return res.status(400).json({ msg: "Email already used!" });
      }
    }

    const user = await userSchema.create(req.body.updates);
    return res.status(200).json(user);
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({ msg: "Error registering the user" });
  }
};

module.exports = { getInfo, updateUser, deleteAccount, registerArtist };












// const userSchema = require("../models/user");
// const eventSchema = require("../models/event");
// const purchaseSchema = require("../models/purchase");
// const venueSchema = require("../models/venue");

// const updateUser = async (req, res) => {
//   const { id } = req.params;
//   const { operation, amount, updates } = req.body;
//   const currentUser = req.user;

//   try {
//     const user = await userSchema.findById(id);
//     if (!user) {
//       return res.status(404).json({ msg: "User not found" });
//     }

//     if (user._id != currentUser.userId) {
//       return res.status(401).json({ msg: "Unauthorized: Wrong User" });
//     }

//     if (operation?.type === "profileChange" && operation?.task === "editing") {
//       await updateUserProfile(id, updates);
//       return res.status(200).json({ msg: "User profile updated" });
//     }

//     if (operation?.type === "follow") {
//       if (operation?.task === "artist" || operation?.task === "venue") {
//         await toggleFollow(req, res);
//         return res.status(200).json({ msg: "User updated" });
//       }
//     }

//     if (operation?.type == "accountBalance") {
//       await updateUserBalance(id, operation, amount);
//       return res.status(200).json({ msg: "User balance updated" });
//     }

//     if (operation?.type === "eventStatus") {
//       await addToEvent(req);
//    await   updateUserProfile(id, updates);
//       return res.status(200).json({ msg: "User updated" });
//     }
//   } catch (error) {
//     console.error("Error updating user:", error);
//     return res.status(500).json({ msg: "Internal server error" });
//   }
// };

// const deleteAccount = async (req, res) => {};

// const getInfo = async (req, res) => {
//   console.log(req.query);
//   const { field } = req.query;
//   const currentUser = req.user;

//   if (!currentUser) {
//     return res.status(401).json({ msg: "Unauthorized user!" });
//   }
// let user
//   try {
//     if (
//       !field ||
//       field === "all" ||
//       field === "user" ||
//       field === "favEvents" ||
//       field === "favVenues" ||
//       field === "favArtists"
//     ) {
//        user = await userSchema.findById(currentUser?.userId);

//       if (!user) {
//         return res.status(404).json({ msg: "User not found!" });
//       }

//       if (user._id.toString() !== currentUser.userId) {
//         return res.status(401).json({ msg: "Unauthorized user!" });
//       }
//     }
//     const userWithoutPassword = { ...user.toObject() };
//     delete userWithoutPassword.password;

//     const response = { user: userWithoutPassword };


//     if (!field || field === "all" || field === "myEvents") {
//       response.myEvents = await eventSchema
//         .find({
//           $or: [
//             { "staff._id": currentUser.userId },
//             { "createdBy.userId": currentUser.userId },
//           ],
//         })
//         .sort({ createdAt: -1 });
//     }

//     if (!field || field === "all" || field === "myTickets") {
//       response.tickets = await purchaseSchema
//         .find({ "user.endUser.userId": currentUser.userId })
//         .sort({ createdAt: -1 });
//     }

//     if (!field || field === "all" || field === "favEvents") {
//       const allEvents = await eventSchema.find();
//       response.favEvents = allEvents.filter(
//         (event) =>
//           user.likedEvents.includes(event._id) ||
//           user.goingToEvents.includes(event._id)
//       );
//     }

//     if (!field || field === "all" || field === "favVenues") {
//       response.favVenues = await venueSchema.find({
//         _id: { $in: user.followedVenues },
//       });
//     }

//     if (!field || field === "all" || field === "favArtists") {
//       response.favArtists = await userSchema.find({
//         _id: { $in: user.followedArtists },
//       });
//     }

//     return res.status(200).json(response);
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ msg: "Error retrieving user info" });
//   }
// };

// const updateUserProfile = async (userId, updates) => {
//   await userSchema.findByIdAndUpdate(userId, updates);
// };

// const toggleFollow = async (req, res) => {
//   const { id } = req.params;
//   const { operation } = req.body;
//   const targetModel = operation.task === "artist" ? userSchema : venueSchema;

//   const target = await targetModel.findById(operation.target);
//   const updatedFollowers = target?.followers || [];
//   const index = updatedFollowers.indexOf(id);

//   if (index !== -1) {
//     updatedFollowers.splice(index, 1);
//   } else {
//     updatedFollowers.push(id);
//   }

//   await target.updateOne({ followers: updatedFollowers });
//   await updateUserProfile(id, req.body.updates);
// };

// const updateUserBalance = async (userId, operation, amount) => {
//   const updateAmount = operation.task === "topUp" ? amount : -amount;
//   await userSchema.findByIdAndUpdate(userId, {
//     $inc: { "balance.amount": updateAmount },
//   });
// };

// const addToEvent = async (req, res) => {
//   const operation = req.body?.operation;
//   const currentUser = req.user;

//   if (!operation || !operation.task || !operation.eventId) {
//     return res.status(400).json({ msg: "Missing operation details" });
//   }

//   const selectedEvent = await eventSchema.findById(operation.eventId);
//   if (!selectedEvent) {
//     return res.status(404).json({ msg: "Event not found" });
//   }

//   let updateQuery = {};
//   let updateInterested = [...selectedEvent.interestedUsers];
//   let updateGoingUsers = [...selectedEvent.goingUsers];

//   if (operation.task === "interest" || operation.task === "going") {
//     const targetArray =
//       operation.task === "interest" ? updateInterested : updateGoingUsers;
//     const index = targetArray.indexOf(currentUser.userId);
//     if (index !== -1) {
//       targetArray.splice(index, 1); // Remove user from the list
//     } else {
//       targetArray.push(currentUser.userId); // Add user to the list
//       if (
//         operation.task === "interest" &&
//         updateGoingUsers.includes(currentUser.userId)
//       ) {
//         const goingIndex = updateGoingUsers.indexOf(currentUser.userId);
//         updateGoingUsers.splice(goingIndex, 1);
//       } else if (
//         operation.task === "going" &&
//         updateInterested.includes(currentUser.userId)
//       ) {
//         const interestIndex = updateInterested.indexOf(currentUser.userId);
//         updateInterested.splice(interestIndex, 1);
//       }
//     }
//     updateQuery = {
//       goingUsers: updateGoingUsers,
//       interestedUsers: updateInterested,
//     };
//   } else if (operation.task === "purchase") {
//     // if (selectedEvent.interestedUsers?.includes(currentUser.userId)) {
//     //   const index = updateInterested.indexOf(currentUser.userId);
//     //   if (index !== -1) {
//     //     updateInterested.splice(index, 1); // Remove user from interested list
//     //   }
//     // }
//     // const index = updateGoingUsers.indexOf(currentUser.userId);
//     // if (index == -1) {
//     //   updateGoingUsers.push(currentUser.userId); // add user to going list
//     // }
//     // const eventTicket = req.body.eventTicket;
//     // let newAttendees = selectedEvent?.attendees;
//     // newAttendees.push(...eventTicket?.tickets);
//     // updateQuery = {
//     //   goingUsers: updateGoingUsers,
//     //   interestedUsers: updateInterested,
//     //   attendees: newAttendees,
//     //   tickets: req.body.updatedEventTickets,
//     // };
//   }

//   try {
//     await selectedEvent.updateOne({ $set: updateQuery }, { new: true });

//     // res.status(200).json({ msg: "Event updated" });
//   } catch (error) {
//     console.log("Error updating event:", error);
//   }
// };

// const registerArtist = async (req, res) => {
//   const { email, username } = req.body.updates;

//   const query = {
//     $or: [{ username: username }, { email: email }],
//   };

//   try {
//     // const existingUser = await userSchema.findOne(query);

//     // if (existingUser) {
//     //   if (existingUser.username === username) {
//     //     return res.status(500).json({msg:"Nome de usuário não disponível!"});
//     //   } else {
//     //     return res.status(500).json({msg:"Este email já foi utilizado!"});
//     //   }
//     // }

//     const user = await userSchema.create({ ...req.body.updates });

//     return res.status(200).json(user);
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ msg: "Error registering the user" });
//   }
// };
// module.exports = { getInfo, updateUser, deleteAccount, registerArtist };
