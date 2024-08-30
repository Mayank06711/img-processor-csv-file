import Product from "../model/productModel.js";
import Status from "../model/statusModel.js";
import { v4 as uuid } from 'uuid';
import fs from "fs";
import csvParser from "csv-parser";
import imageProcessor from "../utils/imageProcessingService.js";
class CSVHandler {
    static async validateAndUploadCSV(req, res){
        if(!req.file){
            return res.status(400).json({msg: "No file uploaded"})
        } 
         const filePath = req.file.path;
         const requiredColumns = ['S.No.', 'Product Name', 'Input Image Urls'];
         let isValid = true;
         let errorMessages = [];
         const result = [];
       try {
         await new Promise((resolve, reject) =>{
            fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('headers', (headers)=>{
               // Check if all required columns are present
               const missingColumns  = requiredColumns.filter(column => !headers.includes(column));
               if(missingColumns.length > 0){
                   isValid = false;
                   errorMessages.push(`Missing columns: ${missingColumns.join(', ')}`);
               }
            })
            .on('data', (data)=>{
                requiredColumns.forEach((column)=>{
                    if(!data[column] || data[column].trim() === ''){

                    }
                })

               // Additional validation for URLs (ensure that 'Input Image Urls' contains valid URLs)
               const urls = data['Input Image Urls'] ? data['Input Image Urls'].split(',') : [];
               urls.forEach((url, index) => {
                try {
                //parses the given string as a URL and will throw an error if the string is not a valid URL.
                new URL(url.trim());
            } catch (error) {
             isValid = false;
             errorMessages.push(`Invalid URL in 'Input Image Urls' at row ${data['Serial Number']}, index ${index + 1}`);
            }
           });

           result.push(data);
         })
         .on('end', async ()=>{
             if(!isValid){
                  return reject(new Error(`CSV validation failed: ${errorMessages.join(', ')}`))
               }
                const reqId = uuid()
                const prodPromises = result.map(async (row)=>{
                //create  products instanc 
                const product = new Product({
                    serialNumber: +row['S. No.'],
                    productName: row['Product Name'],
                    inputImages: row['Input Image Urls'].split(',').map(url => url.trim()),
                });
                console.log(product);
            try {
                 await product.save();
            } catch (error) {
                console.log(error, "your love")
            }
              return product._id
            });
            const productIds = await Promise.all(prodPromises);
            await Status.create({
            requestId: reqId,
            productId: productIds[0],
            status: 'pending',
        });
            console.log(req.csvData, "\n", "product csv data")
            imageProcessor.processImg(productIds, reqId)
            fs.unlinkSync(filePath); //  delete temporary file
            console.log("Image processing done", filePath);
            return res.status(200).json({requestId: reqId, msg: "Successfully submitted your CSV file"})
        })
        .on('error', (err) => {
            reject(err);
        });
    })
    } catch (error) {
        console.log(error, "validateAndProcessCSV");
        return res.status(500).json({ message: 'Error processing CSV file', error: error.message });
      }
    }

    static async checkStatus(req, res){
     try {
        const sts = await Status.findOne({requestId: req.params.reqId});
        if(!sts){
          return res.status(404).json({ message: 'Request not found' });
         }
         res.json({ status: sts.status, productId: sts.productId });
     } catch (error) {
            console.log("Error checking status", error.message)
            throw error;
      }
    }
}

export default CSVHandler