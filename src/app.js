import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit'; // use to protect from brute-force attacks and service-denied requests
import sanitize from "express-mongo-sanitize"
const app = express();

const limitIncomingRequests = rateLimit({
    max: 1500,                      // Maximum number of requests that a client can make within the defined windowMs
    windowMs: 60 * 60 * 1000,       // The duration in milliseconds for which the rate limiting applies (in this case, 1 hour)
    message: "Too many requests from this IP, please try again after an hour"  // The message to send back when the limit is exceeded
});


app.use("/api", limitIncomingRequests)

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
})) // to use this server from frontend side

app.use(express.json({limit: "20kb"})); // help to parse incoming req and extract things from request
app.use(sanitize()) // it will look for no sequal query parameters in req obj(req.body, params) and filter out all $ and .  used in mongodb thus sanitize req body 
app.use(express.urlencoded({extended: true, limit:"20kb"}))


// import routes and middlewares
import errorHandler from './utils/error.js';
import csvRoute from "./routes/csv.routes.js"
app.use(errorHandler)

app.use("/api/v1/csv", csvRoute)

export { app }