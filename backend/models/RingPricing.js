import mongoose from 'mongoose';

const RingPricingSchema = new mongoose.Schema({
  basePrice: {
    type: Number,
    required: true,
    default: 2999
  },
  minPrice: {
    type: Number,
    default: 1500
  },
  maxPrice: {
    type: Number,
    default: 4500
  },
  headVariantModifiers: {
    type: Map,
    of: Number,
    default: new Map()
  },
  shankVariantModifiers: {
    type: Map,
    of: Number,
    default: new Map()
  },
  caratWeightModifiers: {
    type: Map,
    of: Number,
    default: new Map()
  },
  matchingBandModifiers: {
    type: Map,
    of: Number,
    default: new Map()
  },
  metalColorModifiers: {
    type: Map,
    of: Number,
    default: new Map()
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('RingPricing', RingPricingSchema);
