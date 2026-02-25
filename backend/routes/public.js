import express from 'express';
import HeadVariant from '../models/HeadVariant.js';
import ShankVariant from '../models/ShankVariant.js';
import ShankCategory from '../models/ShankCategory.js';
import MetalColor from '../models/MetalColor.js';
import RingPricing from '../models/RingPricing.js';
import CaratWeight from '../models/CaratWeight.js';
import DiamondShape from '../models/DiamondShape.js';
import SettingStyle from '../models/SettingStyle.js';

const router = express.Router();

// ===== PUBLIC API ROUTES =====

// Get all head variants
router.get('/heads', async (req, res) => {
  try {
    const heads = await HeadVariant.find()
      .populate('shank')
      .populate('shanks')
      .populate('diamondShape')
      .populate('settingStyle')
      .populate('caratWeight')
      .sort({ createdAt: 1 });
    res.json(heads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all shank variants
router.get('/shanks', async (req, res) => {
  try {
    const shanks = await ShankVariant.find().sort({ createdAt: 1 });
    res.json(shanks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all metal colors
router.get('/colors', async (req, res) => {
  try {
    const colors = await MetalColor.find({ active: true }).sort({ createdAt: 1 });
    res.json(colors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pricing configuration
router.get('/pricing', async (req, res) => {
  try {
    const pricing = await RingPricing.findOne() || {
      basePrice: 2999,
      minPrice: 1500,
      maxPrice: 4500
    };
    res.json(pricing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all ring configuration (complete)
router.get('/config', async (req, res) => {
  try {
    const heads = await HeadVariant.find()
      .populate('shank')
      .populate('shanks')
      .populate('diamondShape')
      .populate('settingStyle')
      .populate('caratWeight');
    const shanks = await ShankVariant.find();
    const shankCategories = await ShankCategory.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 });
    const colors = await MetalColor.find({ active: true });
    const caratWeights = await CaratWeight.find();
    const diamondShapes = await DiamondShape.find();
    const settingStyles = await SettingStyle.find();
    const pricing = await RingPricing.findOne();

    res.json({
      heads,
      shanks,
      colors,
      caratWeights,
      diamondShapes,
      settingStyles,
      shankCategories,
      pricing: pricing || {
        basePrice: 2999,
        minPrice: 1500,
        maxPrice: 4500
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
