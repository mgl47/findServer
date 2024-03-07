const express=require("express")
const {login,register}=require("../controllers/auth")

const AuthRouter =express.Router()

AuthRouter.route("/login").post(login)
AuthRouter.route("/register").post(register)




module.exports=AuthRouter