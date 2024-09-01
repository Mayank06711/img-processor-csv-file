import express from 'express';
import Webhook from '../services/webhookHandler.js';
const router = express.Router();

router.route("/handle").post(Webhook.handleWebhook);

export default router;
