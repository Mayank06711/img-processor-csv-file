import express from 'express';
import { handleWebhook } from '../services/webhookHandler.js';

const router = express.Router();

router.post('/webhook', handleWebhook);

export default router;
