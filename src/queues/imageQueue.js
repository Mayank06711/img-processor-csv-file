import { imageQueue } from "../config/bullmq-config.js";

// Adding job to the image processing queue
export const addImageProcessingJob = async (
  productId,
  reqId,
  filePath,
  colName
) => {
  await imageQueue.add("process-images", {
    productId,
    reqId,
    filePath,
    colName,
  });
};
