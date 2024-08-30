import { Router } from "express";
import Middlewares from "../middleware/middleware.js"
import CSVHandler from "../controller/csvHandler.js"

const router = Router();


router.route("/upload").post(Middlewares.upload.single('csv'), Middlewares.isValidCSV, CSVHandler.uploadCSV)
router.route("/status/:reqId").get(CSVHandler.checkStatus)

export default router;