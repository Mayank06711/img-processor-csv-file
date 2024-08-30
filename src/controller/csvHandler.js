import Product from "../model/productModel.js";
import Status from "../model/statusModel.js";
import { v4 as uuid } from 'uuid';
import fs from "fs";
import csvParser from "csv-parser";
import imageProcessor from "../utils/imageProcessingService.js";
class CSVHandler {
    static async uploadCSV(req, res){
       try {
         const reqId = uuid()
         const result = [];
         const filePath = req.file.path;
         
         fs.createReadStream(filePath)
         .pipe(csvParser())
         .on('data', (data)=>result.push(data))
         .on('end', async ()=>{
            console.log("CSV file processed successfully", result[0]);
            const prodPromises = result.map(async (row)=>{
                //create  products instanc 
                const product = new Product({
                    serialNumber: +row['S. No.'],
                    productName: row['Product Name'],
                    inputImages: row['Input Image Urls'].split(',').map(url => url.trim()),
                });
             console.log(product, "\n", "product")
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

         imageProcessor.processImg(productIds, reqId)
         fs.unlinkSync(filePath);
         console.log("Image processing done", filePath);
         return res.status(200).json({requestId: reqId, msg: "Successfully submitted your CSV file"})
        })
         
       } catch (error) {
          console.log(error, "uploadCSV");
          throw error;
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