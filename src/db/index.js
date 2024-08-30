import mongoose from "mongoose";
import Product from "../model/productModel.js";
import Status from "../model/statusModel.js";

const DB_NAME = process.env.DB_NAME

const connectDB = async () =>{
    try {
        const connectionInstance = await mongoose.connect(
            `${process.env.MONGODB_URL}/${DB_NAME}`
        );
        console.log(
            ` SEE me in src db index.js IF you Forgot
               /n DATABASE CONNECTION ESTABLISHED With DB Host !! ${connectionInstance.connection.host}`
          );
        // const y = await Product.find({})
        // console.log('Found'+ y.length +'documents in Product collection.');
        // await Product.deleteMany({})
        // const x = await Status.deleteMany({})
        // console.log('Deleted '+ x +' documents from Status collection.');
    } catch (error) {
        console.log(
            ` MONGODB CONNECTION FAILED: with data base: ${DB_NAME}  FROM db.index.js`,
            error
          );
          process.exit(1);
    }
}
export default connectDB;