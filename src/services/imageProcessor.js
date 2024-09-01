import fs from "fs";
import csvParser from "csv-parser";
import Utility from "../utils/utility.js";
import Product from "../model/productModel.js";
import sharp from "sharp";
import Status from "../model/statusModel.js";
import Webhook from "./webhookHandler.js";

class Processor {
  static async processImage(prodId, reqId, filePath, colName) {
    try {
      // Update the status to 'in-progress'
      await Status.updateOne({ requestId: reqId }, { status: "in-progress" });

      const product = await Product.findById(prodId);
      const outputImages = product.inputImages.map(() => []);

      // Step 1: Read the existing CSV file and map the rows
      const rowsMap = new Map();
      let headers = [];

      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on("headers", (hdrs) => {
            headers = hdrs; // Save the headers
            if (!headers.includes(colName)) {
              headers.push(colName); // Add the new column if it doesn't exist
            }
          })
          .on("data", (row) => {
            const serialNumber = row["S.No."].trim(); // Normalize serialNumber as string
            rowsMap.set(serialNumber, row);
          })
          .on("end", resolve)
          .on("error", (err) => {
            console.error("Error reading CSV:", err);
            reject(err);
          });
      });

      // Step 2: Process each image set and generate output URLs
      for (let i = 0; i < product.inputImages.length; i++) {
        const inputImageSet = product.inputImages[i];

        for (const imageUrl of inputImageSet) {
          const imageBuffer = await Utility.downloadImage(imageUrl);
          const outputBuffer = await sharp(imageBuffer)
            .jpeg({ quality: 50 })
            .toBuffer();

          const key = `processed-images/${
            "reqId" + reqId
          }/${Date.now()}-${prodId}-${i}.jpeg`;

          const outputUrl = await Utility.multipartUploadToS3(
            process.env.AWS_BUCKET_NAME,
            key,
            {
              buffer: outputBuffer,
              mimetype: "image/jpeg",
              size: outputBuffer.length,
            }
          );

          outputImages[i].push(outputUrl);
        }

        // Step 3: Normalize serialNumber and update the corresponding row
        const serialNumber = String(product.serialNumber[i]).trim(); // Normalize as string
        const row = rowsMap.get(serialNumber);

        // Safeguard to ensure row exists
        if (row) {
          row[colName] = outputImages[i].join(", "); // Add or update the new column
        } else {
          throw new Error(`Row with serial number ${serialNumber} not found.`);
        }
      }

      // Step 4: Write only the updated column back to the original CSV file
      const tempFilePath = `${filePath}.tmp`; // Temporary file to store updated data
      console.log("Writing to temp file:", tempFilePath); // Debugging

      await new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(tempFilePath);

        writeStream.write(headers.join(",") + "\n", (err) => {
          if (err) {
            console.error("Error writing headers:", err);
            reject(err);
          }
        });

        // Write each row, ensuring correct data is placed in each column
        for (let [serialNumber, row] of rowsMap) {
          const rowData = headers
            .map((header) => {
              if (header === colName) {
                return row[header]; // Only write the updated output image URLs to the colName column
              } else {
                return row[header] || ""; // Write existing data for all other columns
              }
            })
            .join(",");
          writeStream.write(rowData + "\n");
        }

        writeStream.end();

        writeStream.on("finish", async () => {
          console.log("Finished writing to temp file.");
          try {
            await fs.promises.rename(tempFilePath, filePath);
            console.log("Temp file renamed to original file.");
            resolve();
          } catch (err) {
            console.error("Error renaming temp file:", err);
            reject(err);
          }
        });

        writeStream.on("error", (err) => {
          console.error("Error with write stream:", err);
          reject(err);
        });
      });

      // Step 5: Update the product with the processed images
      product.outputImages = outputImages;
      await product.save();

      Webhook.triggerWebhook(
        "http://localhost:8003/api/v1/csv/webhook/handle",
        `${reqId}`,
        `${prodId}`,
        "completed"
      );
    } catch (error) {
      console.error("Error in processImage:", error);
     Webhook.triggerWebhook(
        "http://localhost:8003/api/v1/csv/webhook/handle",
        `${reqId}`,
        `${prodId}`,
        "failed"
      );
    }
  }
}

export default Processor;
