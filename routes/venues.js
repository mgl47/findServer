const express=require("express")
const {venues,nearbyVenues,searchVenues}=require("../controllers/venues")

const venuesRouter =express.Router()
venuesRouter.route("/near").get(nearbyVenues)

venuesRouter.route("/").get(venues)
venuesRouter.route("/search").get(searchVenues)






module.exports=venuesRouter