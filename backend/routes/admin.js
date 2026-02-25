import express from 'express';
import multer from 'multer';
import HeadVariant from '../models/HeadVariant.js';
import ShankVariant from '../models/ShankVariant.js';
import ShankCategory from '../models/ShankCategory.js';
import MetalColor from '../models/MetalColor.js';
import RingPricing from '../models/RingPricing.js';
import DiamondShape from '../models/DiamondShape.js';
import SettingStyle from '../models/SettingStyle.js';
import CaratWeight from '../models/CaratWeight.js';
import { uploadToR2, deleteFromR2 } from '../utils/r2Upload.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow all image types and GLB files
    const isImage = file.mimetype.startsWith('image/');
    const isGLB = file.mimetype === 'model/gltf-binary' || 
                  file.mimetype === 'model/gltf+json' || 
                  file.mimetype === 'application/octet-stream' ||
                  file.originalname.toLowerCase().endsWith('.glb');
    
    if (isImage || isGLB) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and GLB files allowed.'));
    }
  }
});

// ===== HEAD VARIANTS MANAGEMENT =====

// Create head variant (combination of shank(s) + shape + style + carat weight)
router.post('/heads', async (req, res) => {
  try {
    const { name, file, scale, posZ, displayName, image, shank, shanks, diamondShape, settingStyle, caratWeight, isDefault } = req.body;

    // Validate that either single shank or multiple shanks are provided
    if ((!shank && (!shanks || shanks.length === 0)) || !diamondShape || !settingStyle || !caratWeight) {
      return res.status(400).json({ error: 'At least one shank, diamond shape, setting style, and carat weight are required.' });
    }

    // Handle single shank
    let shankDoc = null;
    if (shank) {
      shankDoc = await ShankVariant.findById(shank);
      if (!shankDoc) {
        return res.status(404).json({ error: 'Invalid shank reference provided.' });
      }
    }

    // Handle multiple shanks
    let shankDocs = [];
    if (shanks && shanks.length > 0) {
      shankDocs = await ShankVariant.find({ _id: { $in: shanks } });
      if (shankDocs.length !== shanks.length) {
        return res.status(404).json({ error: 'One or more invalid shank references provided.' });
      }
    }

    const [shapeDoc, styleDoc, caratDoc] = await Promise.all([
      DiamondShape.findById(diamondShape),
      SettingStyle.findById(settingStyle),
      CaratWeight.findById(caratWeight)
    ]);

    if (!shapeDoc || !styleDoc || !caratDoc) {
      return res.status(404).json({ error: 'Invalid combination references provided.' });
    }

    const shankName = shankDoc ? shankDoc.name : (shankDocs.length > 0 ? 'multi' : 'unknown');
    const shankDisplay = shankDoc ? shankDoc.displayName : (shankDocs.length > 0 ? shankDocs.map(s => s.displayName).join(' + ') : 'Multiple');
    
    const generatedName = name || `${shankName}_${styleDoc.name}_${shapeDoc.name}_${caratDoc.name}`.toLowerCase();
    const generatedDisplay = displayName || `${shankDisplay} / ${styleDoc.displayName} / ${shapeDoc.displayName} / ${caratDoc.displayName}`;

    const headData = {
      name: generatedName,
      file,
      scale: scale || 0.14,
      posZ: posZ || 0,
      displayName: generatedDisplay,
      image,
      diamondShape,
      settingStyle,
      caratWeight,
      isDefault: !!isDefault
    };

    // Add shank or shanks based on what was provided
    if (shank) {
      headData.shank = shank;
    }
    if (shanks && shanks.length > 0) {
      headData.shanks = shanks;
    }

    const head = new HeadVariant(headData);
    await head.save();

    // Ensure only one default head
    if (head.isDefault) {
      await HeadVariant.updateMany({ _id: { $ne: head._id } }, { isDefault: false });
    }

    const populated = await head.populate(['shank', 'shanks', 'diamondShape', 'settingStyle', 'caratWeight']);
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all heads
router.get('/heads', async (req, res) => {
  try {
    const heads = await HeadVariant.find()
      .populate('shank')
      .populate('shanks')
      .populate('diamondShape')
      .populate('settingStyle')
      .populate('caratWeight');
    res.json(heads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update head variant
router.put('/heads/:id', async (req, res) => {
  try {
    const updates = { ...req.body };

    // Always regenerate name/displayName to reflect current combination
    const head = await HeadVariant.findById(req.params.id);
    if (!head) return res.status(404).json({ error: 'Head variant not found' });

    // Handle shank updates (single or multiple)
    let shankDoc = null;
    let shankDocs = [];
    
    if (updates.shank) {
      shankDoc = await ShankVariant.findById(updates.shank);
      if (!shankDoc) {
        return res.status(404).json({ error: 'Invalid shank reference provided.' });
      }
    } else if (updates.shanks && updates.shanks.length > 0) {
      shankDocs = await ShankVariant.find({ _id: { $in: updates.shanks } });
      if (shankDocs.length !== updates.shanks.length) {
        return res.status(404).json({ error: 'One or more invalid shank references provided.' });
      }
    } else {
      // Use existing shank(s) if not updated
      if (head.shank) {
        shankDoc = await ShankVariant.findById(head.shank);
      } else if (head.shanks && head.shanks.length > 0) {
        shankDocs = await ShankVariant.find({ _id: { $in: head.shanks } });
      }
    }

    const shapeId = updates.diamondShape || head.diamondShape;
    const styleId = updates.settingStyle || head.settingStyle;
    const caratId = updates.caratWeight || head.caratWeight;

    const [shapeDoc, styleDoc, caratDoc] = await Promise.all([
      DiamondShape.findById(shapeId),
      SettingStyle.findById(styleId),
      CaratWeight.findById(caratId)
    ]);

    if (!shapeDoc || !styleDoc || !caratDoc) {
      return res.status(404).json({ error: 'Invalid combination references provided.' });
    }

    // Update shank references
    if (updates.shank) {
      updates.shank = updates.shank;
      updates.shanks = []; // Clear shanks array if single shank is set
    } else if (updates.shanks) {
      updates.shanks = updates.shanks;
      updates.shank = null; // Clear single shank if multiple shanks are set
    }

    updates.diamondShape = shapeId;
    updates.settingStyle = styleId;
    updates.caratWeight = caratId;
    
    const shankName = shankDoc ? shankDoc.name : (shankDocs.length > 0 ? 'multi' : 'unknown');
    const shankDisplay = shankDoc ? shankDoc.displayName : (shankDocs.length > 0 ? shankDocs.map(s => s.displayName).join(' + ') : 'Multiple');
    
    // Always regenerate name and displayName based on current combination
    updates.name = `${shankName}_${styleDoc.name}_${shapeDoc.name}_${caratDoc.name}`.toLowerCase();
    updates.displayName = `${shankDisplay} / ${styleDoc.displayName} / ${shapeDoc.displayName} / ${caratDoc.displayName}`;

    // Normalize isDefault flag
    if (typeof updates.isDefault !== 'undefined') {
      updates.isDefault = !!updates.isDefault;
    }

    const updatedHead = await HeadVariant.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('shank')
      .populate('shanks')
      .populate('diamondShape')
      .populate('settingStyle')
      .populate('caratWeight');

    if (updatedHead?.isDefault) {
      await HeadVariant.updateMany({ _id: { $ne: updatedHead._id } }, { isDefault: false });
    }

    res.json(updatedHead);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete head variant
router.delete('/heads/:id', async (req, res) => {
  try {
    await HeadVariant.findByIdAndDelete(req.params.id);
    res.json({ message: 'Head variant deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== HEAD ATTRIBUTE MANAGEMENT =====

// Diamond shapes CRUD
router.post('/diamond-shapes', async (req, res) => {
  try {
    const shape = new DiamondShape(req.body);
    await shape.save();
    res.status(201).json(shape);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/diamond-shapes', async (req, res) => {
  try {
    const shapes = await DiamondShape.find().sort({ createdAt: 1 });
    res.json(shapes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/diamond-shapes/:id', async (req, res) => {
  try {
    const shape = await DiamondShape.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(shape);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/diamond-shapes/:id', async (req, res) => {
  try {
    await DiamondShape.findByIdAndDelete(req.params.id);
    res.json({ message: 'Diamond shape deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Setting styles CRUD
router.post('/setting-styles', async (req, res) => {
  try {
    const style = new SettingStyle(req.body);
    await style.save();
    res.status(201).json(style);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/setting-styles', async (req, res) => {
  try {
    const styles = await SettingStyle.find().sort({ createdAt: 1 });
    res.json(styles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/setting-styles/:id', async (req, res) => {
  try {
    const style = await SettingStyle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(style);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/setting-styles/:id', async (req, res) => {
  try {
    await SettingStyle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Setting style deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Carat weights CRUD
router.post('/carat-weights', async (req, res) => {
  try {
    const weight = new CaratWeight(req.body);
    await weight.save();
    res.status(201).json(weight);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/carat-weights', async (req, res) => {
  try {
    const weights = await CaratWeight.find().sort({ value: 1 });
    res.json(weights);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/carat-weights/:id', async (req, res) => {
  try {
    const weight = await CaratWeight.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(weight);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/carat-weights/:id', async (req, res) => {
  try {
    await CaratWeight.findByIdAndDelete(req.params.id);
    res.json({ message: 'Carat weight deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SHANK CATEGORIES MANAGEMENT =====
router.post('/shank-categories', async (req, res) => {
  try {
    const { name, displayName, sortOrder, active } = req.body;
    if (!name || !displayName) {
      return res.status(400).json({ error: 'name and displayName are required' });
    }
    const category = new ShankCategory({
      name,
      displayName,
      sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      active: active !== false
    });
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/shank-categories', async (_req, res) => {
  try {
    const categories = await ShankCategory.find().sort({ sortOrder: 1, createdAt: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/shank-categories/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    const category = await ShankCategory.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/shank-categories/:id', async (req, res) => {
  try {
    await ShankCategory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Shank category deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SHANK VARIANTS MANAGEMENT =====

// Create shank variant
router.post('/shanks', async (req, res) => {
  try {
    const { name, file, scale, posZ, displayName, image, category } = req.body;
    
    const shank = new ShankVariant({
      name,
      file,
      scale: scale || 0.14,
      posZ: posZ || 0,
      displayName,
      image,
      category: category || 'Most Popular'
    });

    await shank.save();
    res.status(201).json(shank);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all shanks
router.get('/shanks', async (req, res) => {
  try {
    const shanks = await ShankVariant.find();
    res.json(shanks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update shank variant
router.put('/shanks/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    if (!updates.category) updates.category = 'Most Popular';

    const shank = await ShankVariant.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    res.json(shank);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete shank variant
router.delete('/shanks/:id', async (req, res) => {
  try {
    await ShankVariant.findByIdAndDelete(req.params.id);
    res.json({ message: 'Shank variant deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== METAL COLORS MANAGEMENT =====

// Create metal color
router.post('/colors', async (req, res) => {
  try {
    const { name, hexCode, displayName, image, priceModifier, active } = req.body;
    
    const color = new MetalColor({
      name,
      hexCode,
      displayName,
      image,
      priceModifier: priceModifier || 0,
      active: active !== false
    });

    await color.save();
    res.status(201).json(color);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all colors
router.get('/colors', async (req, res) => {
  try {
    const colors = await MetalColor.find();
    res.json(colors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update color
router.put('/colors/:id', async (req, res) => {
  try {
    const color = await MetalColor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json(color);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete color
router.delete('/colors/:id', async (req, res) => {
  try {
    await MetalColor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Color deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== PRICING MANAGEMENT =====

// Get pricing
router.get('/pricing', async (req, res) => {
  try {
    let pricing = await RingPricing.findOne();
    if (!pricing) {
      pricing = new RingPricing();
      await pricing.save();
    }
    res.json(pricing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update pricing
router.put('/pricing', async (req, res) => {
  try {
    let pricing = await RingPricing.findOne();
    if (!pricing) {
      pricing = new RingPricing(req.body);
    } else {
      Object.assign(pricing, req.body);
    }
    await pricing.save();
    res.json(pricing);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Set a shank modifier (create/update)
router.put('/pricing/shank/:id', async (req, res) => {
  try {
    const { value } = req.body;
    let pricing = await RingPricing.findOne();
    if (!pricing) {
      pricing = new RingPricing();
    }
    pricing.shankVariantModifiers = pricing.shankVariantModifiers || {};
    pricing.shankVariantModifiers.set
      ? pricing.shankVariantModifiers.set(req.params.id, Number(value) || 0)
      : (pricing.shankVariantModifiers[req.params.id] = Number(value) || 0);
    await pricing.save();
    res.json(pricing);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a shank modifier
router.delete('/pricing/shank/:id', async (req, res) => {
  try {
    let pricing = await RingPricing.findOne();
    if (!pricing) return res.status(404).json({ error: 'Pricing not found' });
    if (pricing.shankVariantModifiers?.delete) {
      pricing.shankVariantModifiers.delete(req.params.id);
    } else if (pricing.shankVariantModifiers) {
      delete pricing.shankVariantModifiers[req.params.id];
    }
    await pricing.save();
    res.json(pricing);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Set a carat modifier
router.put('/pricing/carat/:id', async (req, res) => {
  try {
    const { value } = req.body;
    let pricing = await RingPricing.findOne();
    if (!pricing) pricing = new RingPricing();
    pricing.caratWeightModifiers = pricing.caratWeightModifiers || {};
    pricing.caratWeightModifiers.set
      ? pricing.caratWeightModifiers.set(req.params.id, Number(value) || 0)
      : (pricing.caratWeightModifiers[req.params.id] = Number(value) || 0);
    await pricing.save();
    res.json(pricing);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a carat modifier
router.delete('/pricing/carat/:id', async (req, res) => {
  try {
    let pricing = await RingPricing.findOne();
    if (!pricing) return res.status(404).json({ error: 'Pricing not found' });
    if (pricing.caratWeightModifiers?.delete) {
      pricing.caratWeightModifiers.delete(req.params.id);
    } else if (pricing.caratWeightModifiers) {
      delete pricing.caratWeightModifiers[req.params.id];
    }
    await pricing.save();
    res.json(pricing);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Set a matching band modifier (bandIndex should be 'band1' or 'band2')
router.put('/pricing/matching/:shankId/:bandIndex', async (req, res) => {
  try {
    const { value } = req.body;
    const key = `${req.params.shankId}_${req.params.bandIndex}`;
    let pricing = await RingPricing.findOne();
    if (!pricing) pricing = new RingPricing();
    pricing.matchingBandModifiers = pricing.matchingBandModifiers || {};
    pricing.matchingBandModifiers.set
      ? pricing.matchingBandModifiers.set(key, Number(value) || 0)
      : (pricing.matchingBandModifiers[key] = Number(value) || 0);
    await pricing.save();
    res.json(pricing);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a matching band modifier
router.delete('/pricing/matching/:shankId/:bandIndex', async (req, res) => {
  try {
    const key = `${req.params.shankId}_${req.params.bandIndex}`;
    let pricing = await RingPricing.findOne();
    if (!pricing) return res.status(404).json({ error: 'Pricing not found' });
    if (pricing.matchingBandModifiers?.delete) {
      pricing.matchingBandModifiers.delete(key);
    } else if (pricing.matchingBandModifiers) {
      delete pricing.matchingBandModifiers[key];
    }
    await pricing.save();
    res.json(pricing);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Set a single matching band modifier (legacy/new single-key support)
router.put('/pricing/matching/:shankId', async (req, res) => {
  try {
    const { value } = req.body;
    const key = `${req.params.shankId}_band`;
    let pricing = await RingPricing.findOne();
    if (!pricing) pricing = new RingPricing();
    pricing.matchingBandModifiers = pricing.matchingBandModifiers || {};
    pricing.matchingBandModifiers.set
      ? pricing.matchingBandModifiers.set(key, Number(value) || 0)
      : (pricing.matchingBandModifiers[key] = Number(value) || 0);
    await pricing.save();
    res.json(pricing);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a single matching band modifier
router.delete('/pricing/matching/:shankId', async (req, res) => {
  try {
    const key = `${req.params.shankId}_band`;
    let pricing = await RingPricing.findOne();
    if (!pricing) return res.status(404).json({ error: 'Pricing not found' });
    if (pricing.matchingBandModifiers?.delete) {
      pricing.matchingBandModifiers.delete(key);
    } else if (pricing.matchingBandModifiers) {
      delete pricing.matchingBandModifiers[key];
    }
    await pricing.save();
    res.json(pricing);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ===== FILE UPLOAD TO R2 =====

// Upload file to Cloudflare R2
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);

    res.json({
      success: true,
      url: fileUrl,
      fileName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete file from R2
router.delete('/upload', async (req, res) => {
  try {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ error: 'File URL required' });
    }

    await deleteFromR2(fileUrl);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
