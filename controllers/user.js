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
    }

    await selectedEvent.updateOne({ $set: updateQuery }, { new: true }); // Update event with new lists
    // return res.status(200).json({ msg: "Event updated" });
  } catch (error) {
    console.error("Error updating event:", error);
    return res.status(500).json({ msg: "Error updating event" });
  }
};

// Controller function to handle user updates
// const updateUser = async (req, res) => {
//   const { id } = req.params; // User ID
//   const { operation, amount, updates } = req.body; // Operation details
//   const currentUser = req.user; // Current user details

//   try {
//     const user = await userSchema.findById(id); // Find user by ID
//     if (!user) {
//       return res.status(404).json({ msg: "User not found" });
//     }

//     if (user._id.toString() !== currentUser.userId) {
//       return res.status(401).json({ msg: "Unauthorized: Wrong User" });
//     }

//     // Handle different operation types
//     switch (operation?.type) {
//       case "profileChange":
//         if (operation?.task === "editing") {
//           await updateUserProfile(id, updates);
//           return res.status(200).json({ msg: "User profile updated" });
//         }
//         break;
//       case "follow":
//         if (operation?.task === "artist" || operation?.task === "venue") {
//           await toggleFollow(req, res);
//           return; // Ensure no further response is sent
//         }
//         break;
//       case "accountBalance":
//         await updateUserBalance(id, operation, amount);
//         return res.status(200).json({ msg: "User balance updated" });
//       case "eventStatus":
//         await addToEvent(req, res);
//         await updateUserProfile(id, updates);
//         return res.status(200).json({ msg: "User updated" });
//       case "notification":
//         await updateUserProfile(id, updates);
//         return res.status(200).json({ msg: "Notifications updated" });
//       default:
//         return res.status(400).json({ msg: "Invalid operation type" });
//     }
//   } catch (error) {
//     console.error("Error updating user:", error);
//     return res.status(500).json({ msg: "Internal server error" });
//   }
// };
const updateUser = async (req, res) => {
  const { id } = req.params; // User ID
  const { operation, amount, updates } = req.body; // Operation details
  const currentUser = req.user; // Current user details

  try {
    const user = await userSchema
      .findById(id)
      .select(
       [ "-goingToEvents",
        "-likedEvents",
        "-password",
        "-balance",
        "-followedVenues",
        "-followedArtists",
        "-updatedAt"]
      ); // Find user by ID
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user._id.toString() !== currentUser.userId) {
      return res.status(401).json({ msg: "Unauthorized: Wrong User" });
    }

    switch (operation?.type) {
      case "profileChange":
        if (operation?.task === "editing") {
          await userSchema.findByIdAndUpdate(id, updates);
          await updateEventUserDetails(id, updates);
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
      case "notification":
        await updateUserProfile(id, updates);
        return res.status(200).json({ msg: "Notifications updated" });
      default:
        return res.status(400).json({ msg: "Invalid operation type" });
    }
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

const updateEventUserDetails = async (userId, updates) => {
  try {
    await eventSchema.updateMany(
      {
        $or: [
          { "organizers._id": userId },
          { "staff._id": userId },
          { "artists._id": userId },
        ],
      },
      {
        $set: {
          "organizers.$[elem]": updates,
          "staff.$[elem]": updates,
          "artists.$[elem]": updates,
        },
      },
      {
        arrayFilters: [{ "elem._id": userId }],
        multi: true,
      }
    );
  } catch (error) {
    console.error("Error updating event user details:", error);
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
    const user = await userSchema
      .findById(currentUser.userId)
      .select("-password"); // Find user by ID
    if (!user) {
      return res.status(404).json({ msg: "User not found!" });
    }

    if (user._id.toString() !== currentUser.userId) {
      return res.status(401).json({ msg: "Unauthorized user!" });
    }

    const response = { user };

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
        .find({ "user.endUser.userId": currentUser?.userId })
        .sort({ createdAt: -1 });
    }

    if (!field || field === "all" || field === "favEvents") {
      response.favEvents = await eventSchema.find({
        _id: { $in: user.likedEvents.concat(user.goingToEvents) },
      });
      // .sort({ createdAt: -1 });
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
