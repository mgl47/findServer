const express=require("express")
const {events}=require("../controllers/events")

const eventsRouter =express.Router()

eventsRouter.route("/").get(events)





module.exports=eventsRouter