const express=require("express")
const {events,searchEvents}=require("../controllers/events")

const eventsRouter =express.Router()

eventsRouter.route("/").get(events)
eventsRouter.route("/search").get(searchEvents)







module.exports=eventsRouter