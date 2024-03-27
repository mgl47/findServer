const express=require("express")
const {users}=require("../controllers/users")

const usersRouter =express.Router()

usersRouter.route("/").get(users)





module.exports=usersRouter