import HeadVariant from '../models/HeadVariant.js';
import ShankVariant from '../models/ShankVariant.js';
import MetalColor from '../models/MetalColor.js';
import RingPricing from '../models/RingPricing.js';
import DiamondShape from '../models/DiamondShape.js';
import SettingStyle from '../models/SettingStyle.js';
import CaratWeight from '../models/CaratWeight.js';

async function ensureHeadVariantIndex() {
  const expectedKey = {
    shank: 1,
    diamondShape: 1,
    settingStyle: 1,
    caratWeight: 1
  };

  try {
    const indexes = await HeadVariant.collection.indexes();
    const existing = indexes.find((idx) => idx.name === 'unique_head_combo');

    const matchesExpected =
      existing &&
      Object.keys(expectedKey).length === Object.keys(existing.key).length &&
      Object.entries(expectedKey).every(([key, value]) => existing.key[key] === value);

    if (existing && !matchesExpected) {
      await HeadVariant.collection.dropIndex('unique_head_combo');
    }

    if (!matchesExpected) {
      await HeadVariant.collection.createIndex(expectedKey, {
        unique: true,
        name: 'unique_head_combo'
      });
    }
  } catch (error) {
    console.error('⚠️ Unable to ensure head index:', error);
    throw error;
  }
}

export async function initializeDatabase() {
  try {
    await ensureHeadVariantIndex();

    // Check if data exists
    const shapeCount = await DiamondShape.countDocuments();
    if (shapeCount > 0) {
      return;
    }


    // Create diamond shapes
    const shapes = await DiamondShape.insertMany([
      { name: 'round', displayName: 'Round' },
      { name: 'oval', displayName: 'Oval' }
    ]);

    // Create setting styles
    const styles = await SettingStyle.insertMany([
      { name: 'prong', displayName: 'Prong' },
      { name: 'bezel', displayName: 'Bezel' }
    ]);

    // Create carat weights
    const carats = await CaratWeight.insertMany([
      { name: '1_0_ct', displayName: '1.0 ct', value: 1.0 },
      { name: '1_5_ct', displayName: '1.5 ct', value: 1.5 },
      { name: '2_0_ct', displayName: '2.0 ct', value: 2.0 }
    ]);

    // Map helpers
    const shapeByName = Object.fromEntries(shapes.map((s) => [s.name, s]));
    const styleByName = Object.fromEntries(styles.map((s) => [s.name, s]));
    const caratByName = Object.fromEntries(carats.map((c) => [c.name, c]));

    // Create default head variants (combinations)
    const heads = await HeadVariant.insertMany([
      {
        name: 'prong_round_1_0_ct',
        file: './head.glb',
        scale: 0.14,
        posZ: 0,
        displayName: 'Prong / Round / 1.0 ct',
        diamondShape: shapeByName.round._id,
        settingStyle: styleByName.prong._id,
        caratWeight: caratByName['1_0_ct']._id
      },
      {
        name: 'bezel_oval_1_5_ct',
        file: './head_2.glb',
        scale: 0.14,
        posZ: 0,
        displayName: 'Bezel / Oval / 1.5 ct',
        diamondShape: shapeByName.oval._id,
        settingStyle: styleByName.bezel._id,
        caratWeight: caratByName['1_5_ct']._id
      }
    ]);

    // Create default shank variants
    const shanks = await ShankVariant.insertMany([
      {
        name: 'shank',
        file: './shank.glb',
        scale: 0.14,
        posZ: 0,
        displayName: 'Shank'
      },
      {
        name: 'shank_3',
        file: './shank_3.glb',
        scale: 0.14,
        posZ: 0,
        displayName: 'Shank 3'
      },
      {
        name: 'shank_4',
        file: './shank_4.glb',
        scale: 0.14,
        posZ: 0,
        displayName: 'Shank 4'
      }
    ]);

    // Create default metal colors
    const colors = await MetalColor.insertMany([
      {
        name: 'yellow_gold',
        hexCode: '#e5b377',
        displayName: 'Yellow Gold',
        priceModifier: 0,
        active: true
      },
      {
        name: 'white_gold',
        hexCode: '#c2c2c3',
        displayName: 'White Gold',
        priceModifier: 0,
        active: true
      },
      {
        name: 'rose_gold',
        hexCode: '#f2af83',
        displayName: 'Rose Gold',
        priceModifier: 0,
        active: true
      }
    ]);

    // Create pricing configuration
    const pricing = new RingPricing({
      basePrice: 2999,
      minPrice: 1500,
      maxPrice: 4500
    });
    await pricing.save();

  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}
