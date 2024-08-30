import mongoose from "mongoose";

const statusSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
}, {timestamps:true});

statusSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Status = mongoose.model('Status', statusSchema);

export default Status;