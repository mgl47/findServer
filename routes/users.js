const express=require("express")
const {users,searchUsers}=require("../controllers/users")

const usersRouter =express.Router()

usersRouter.route("/").get(users)

usersRouter.route("/search").get(searchUsers)






module.exports=usersRouter