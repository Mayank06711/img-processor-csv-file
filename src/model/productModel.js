import mongoose from "mongoose"

const productSchema = new mongoose.Schema({
  serialNumber: [Number],
  productName: [String],
  inputImages: [[String]],
  outputImages: [[String]],
}, {timestamps:true});

const Product = mongoose.model('Product', productSchema);

export default Product;