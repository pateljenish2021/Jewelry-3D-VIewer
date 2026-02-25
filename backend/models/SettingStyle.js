import mongoose from 'mongoose';

const SettingStyleSchema = new mongoose.Schema({
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
  // Optional per-shape images: map from shape internal name -> image URL
  images: {
    type: Map,
    of: String,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('SettingStyle', SettingStyleSchema);
