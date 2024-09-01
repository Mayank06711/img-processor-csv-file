import  { Queue, Worker } from "bullmq";
import Processor from "../services/imageProcessor.js";
import  redis  from './redisConfig.js'; // Separate Redis config for better management

// Initialize BullMQ Queue
export const imageQueue = new Queue('image-processing', {
  connection: redis
});

// Create a worker to process jobs
new Worker('image-processing', async job => {
  await Processor.processImage(job.data.productId, job.data.reqId, job.data.filePath, job.data.colName);
  console.log('image processing done, from worker');
}, { connection: redis });

