import axios from "axios";
import  {  S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, GetObjectCommand} from "@aws-sdk/client-s3"  
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import sharp from "sharp";
import Product from "../model/productModel.js";
import Status from "../model/statusModel.js";

// Create a new S3 client using the provided AWS credentials and region
const s3Client = new S3Client({
    region:process.env.AWS_REGION,
    credentials:{
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
})


class imageProcessor {
  static async downloadImage(url) {
    try {
      const response = await axios.get(url, { responseType: "arraybuffer" });
      return Buffer.from(response.data, "binary");
    } catch (error) {
      console.log("Error downloading img", error.message);
      throw error;
    }
  }
 
  static async multipartUploadToS3(bucket, key, file) {
    const createMultipartUpload = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: file.mimetype,
    });

    try {
      const multipartUpload = await s3Client.send(createMultipartUpload);
      const uploadId = multipartUpload.UploadId;
      const chunkSize = 5 * 1024 * 1024; // 5 MB
      const numChunks = Math.ceil(file.size / chunkSize);
      const uploadParts  = [];

      for (let i = 0; i < numChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.buffer.slice(start, end);
       // console.log(chunk)
        const uploadPart = new UploadPartCommand({
          Bucket: bucket,
          Key: key,
          PartNumber: i + 1,
          UploadId: uploadId,
          Body: chunk,
        });

        const uploadPartResponse = await s3Client.send(uploadPart);
        //console.log(uploadPartResponse.ETag,"ET")
        uploadParts.push({
          ETag: uploadPartResponse.ETag,
          PartNumber: i + 1,
        });
      }

      const completeMultipartUpload = new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: uploadParts,
        },
      });

      await s3Client.send(completeMultipartUpload);

      const command =new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60*60*5 }); // Generate a signed URL  for
      //return `https://${bucket}.s3.amazonaws.com/${key}`;   // this will lead to invalid access 
      return signedUrl;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  static async processImg(prodIds, reqId) {
    // Update the status to 'in-progress'
    console.log(prodIds)
    await Status.updateOne({ requestId: reqId }, { status: "in-progress" });

    for (const productId of prodIds) {
      const product = await Product.findById(productId);
      const outputImages = [];

      for (const imageUrl of product.inputImages) {
        const imageBuffer = await this.downloadImage(imageUrl);
        const outputBuffer = await sharp(imageBuffer)
          .jpeg({ quality: 50 }) // Reduce JPEG quality to 50%
          .toBuffer();

        // Generate a unique key for the S3 object
        const key = `processed-images/${Date.now().toLocaleString()}-${productId}.jpeg`;


        const outputUrl = await this.multipartUploadToS3(process.env.AWS_BUCKET_NAME, key,{
            buffer: outputBuffer,
            mimetype: 'image/jpeg',
            size: outputBuffer.length,
        }); 
        console.log("Image processed and uploaded to S3:", outputUrl);
        outputImages.push(outputUrl);
      }

      product.outputImages = outputImages;
      await product.save();
    }

    await Status.updateOne({ requestId: reqId }, { status: "completed" });
   


    // Trigger the webhook
    // try {
    //   await axios.post("https://your-webhook-url.com/webhook", {
    //     reqId,
    //     status: "completed",
    //     productId: prodIds, // Assuming one product per request
    //   });
    // } catch (error) {
    //   console.error("Failed to trigger webhook:", error);
    //   // Implement retry logic or error handling here
    // }
  }

}

export default imageProcessor;


//   static async triggerWebhook(url, payload, retries = 3) {
//     for (let attempt = 1; attempt <= retries; attempt++) {
//       try {
//         await axios.post(url, payload);
//         console.log("Webhook triggered successfully");
//         break; // Exit loop on success
//       } catch (error) {
//         if (attempt === retries) {
//           console.error(
//             "Failed to trigger webhook after multiple attempts:",
//             error
//           );
//           // Log or handle the failure
//         } else {
//           console.log(`Retrying webhook (${attempt}/${retries})...`);
//         }
//       }
//     }
//   }