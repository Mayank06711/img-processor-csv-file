import express from "express";
import connectDB from "./db/index.js";
import {app} from "./app.js"



connectDB()
.then(()=>{
  app.listen(process.env.PORT || 8003, ()=>{
  console.log(`Server is running on port: ${process.env.PORT}`)
  });
})
.catch(
  (err)=>{console.log("Mongo DB connection failed !! " + err)}
)


