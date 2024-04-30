const express=require("express")
const {venues,nearbyVenues}=require("../controllers/venues")

const venuesRouter =express.Router()
venuesRouter.route("/near").get(nearbyVenues)

venuesRouter.route("/").get(venues)





module.exports=venuesRouter