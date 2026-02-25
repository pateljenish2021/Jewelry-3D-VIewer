import mongoose from 'mongoose';

const HeadVariantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  shank: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShankVariant',
    required: false // Made optional to support shanks array
  },
  shanks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShankVariant'
  }],
  diamondShape: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DiamondShape',
    required: true
  },
  settingStyle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SettingStyle',
    required: true
  },
  caratWeight: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CaratWeight',
    required: true
  },
  file: {
    type: String,
    required: true
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
  isDefault: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

HeadVariantSchema.index(
  { shank: 1, diamondShape: 1, settingStyle: 1, caratWeight: 1 },
  { unique: true, name: 'unique_head_combo' }
);

export default mongoose.model('HeadVariant', HeadVariantSchema);
