import mongoose from 'mongoose';

const DiamondShapeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  image: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('DiamondShape', DiamondShapeSchema);
