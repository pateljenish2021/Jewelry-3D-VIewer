import mongoose from 'mongoose';

const ShankVariantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  file: {
    type: String,
    required: true
  },
  matchingBandFile1: {
    type: String
  },
  matchingBandFile2: {
    type: String
  },
  scale: {
    type: Number,
    default: 0.14
  },
  posZ: {
    type: Number,
    default: 0
  },
  displayName: {
    type: String,
    required: true
  },
  image: String,
  category: {
    type: String,
    default: 'Most Popular'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('ShankVariant', ShankVariantSchema);
