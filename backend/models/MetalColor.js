import mongoose from 'mongoose';

const MetalColorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  hexCode: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  image: String,
  priceModifier: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('MetalColor', MetalColorSchema);
