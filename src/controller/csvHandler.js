import Product from "../model/productModel.js";
import Status from "../model/statusModel.js";
import { v4 as uuid } from "uuid";
import fs from "fs";
import csvParser from "csv-parser";
import imageProcessor from "../utils/imageProcessingService.js";
import { addImageProcessingJob } from "../queues/imageQueue.js";
class CSVHandler {
  static async validateAndUploadCSV(req, res) {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }
    const filePath = req.file.path;
    const requiredColumns = ["S.No.", "Product Name", "Input Image Urls"];
    let isValid = true;
    let errorMessages = [];
    const result = [];
    try {
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on("headers", (headers) => {
            // Check if all required columns are present
            const missingColumns = requiredColumns.filter(
              (column) => !headers.includes(column)
            );
            if (missingColumns.length > 0) {
              isValid = false;
              errorMessages.push(
                `Missing columns: ${missingColumns.join(", ")}`
              );
            }
          })
          .on("data", (data) => {
            requiredColumns.forEach((column) => {
              if (!data[column] || data[column].trim() === "") {
              }
            });

            // Additional validation for URLs (ensure that 'Input Image Urls' contains valid URLs)
            const urls = data["Input Image Urls"]
              ? data["Input Image Urls"].split(",")
              : [];
            urls.forEach((url, index) => {
              try {
                //parses the given string as a URL and will throw an error if the string is not a valid URL.
                new URL(url.trim());
              } catch (error) {
                isValid = false;
                errorMessages.push(
                  `Invalid URL in 'Input Image Urls' at row ${
                    data["Serial Number"]
                  }, index ${index + 1}`
                );
              }
            });

            result.push(data);
          })
          .on("end", async () => {
            if (!isValid) {
              return reject(
                new Error(`CSV validation failed: ${errorMessages.join(", ")}`)
              );
            }

            const reqId = uuid();
            let prodId = "";

            // Aggregating data from all rows into a single product object to mimic csv file format
            const aggregatedProduct = {
              serialNumber: [], // Array to hold all serial numbers
              productName: [], // Array to hold all product names
              inputImages: [], // Array to hold all input image URLs (as arrays)
              outputImages: [], // Array to hold all output image URLs (initially empty arrays)
            };

            result.forEach((row) => {
              // Add each row's data to the aggregated product object
              aggregatedProduct.serialNumber.push(+row["S.No."]); // Add the serial number to the array
              aggregatedProduct.productName.push(row["Product Name"].trim()); // Add the product name to the array
              aggregatedProduct.inputImages.push(
                row["Input Image Urls"].split(",").map((url) => url.trim()) // Add the input image URLs as an array
              );
              aggregatedProduct.outputImages.push([]); // Initialize corresponding empty output image arrays
            });

            try {
              // Create and save a single product in the database
              const savedProduct = await new Product(aggregatedProduct).save();
              prodId = savedProduct._id;
            } catch (error) {
              console.error("Error saving product:", error);
              return res.status(500).json({ message: "Soomething went wrong." });
            }

            // Create a new status document in the database for the request
            await Status.create({
              requestId: reqId,
              productId: prodId,
              status: "pending",
            });

            // Add job to queue for processing
            await addImageProcessingJob(prodId, reqId, filePath, "Output Image Urls");

            return res
              .status(200)
              .json({ requestId: reqId, msg: "Your CSV file is processing" });
          })
          .on("error", (err) => {
            reject(err);
          });
      });
    } catch (error) {
      console.log(error, "validateAndProcessCSV");
      return res
        .status(500)
        .json({ message: "Error processing CSV file", error: error.message });
    }
  }

  static async checkStatus(req, res) {
    try {
      const sts = await Status.findOne({ requestId: req.params.reqId });
      if (!sts) {
        return res.status(404).json({ message: "Request not found" });
      }
      res.json({ status: sts.status, productId: sts.productId });
    } catch (error) {
      console.log("Error checking status", error.message);
      throw error;
    }
  }
}

export default CSVHandler;
