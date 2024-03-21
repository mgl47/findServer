const express=require("express")
const {venues}=require("../controllers/venues")

const venuesRouter =express.Router()

venuesRouter.route("/").get(venues)





module.exports=venuesRouter