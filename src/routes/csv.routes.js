import { Router } from "express";
import Middlewares from "../middleware/middleware.js"
import CSVHandler from "../controller/csvHandler.js"

const router = Router();


router.route("/upload").post(Middlewares.upload, Middlewares.uploadErrorCatch, CSVHandler.validateAndUploadCSV)
router.route("/status/:reqId").get(CSVHandler.checkStatus)

export default router;