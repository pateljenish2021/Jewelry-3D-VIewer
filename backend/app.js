import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { initializeDatabase } from './utils/initDb.js';

dotenv.config();

const app = express();

let dbConnectPromise = null;
let dbInitialized = false;

export const ensureDatabaseConnected = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (dbConnectPromise) {
    await dbConnectPromise;
    return;
  }

  dbConnectPromise = (async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI / MONGODB_URI is not set in the environment');
    }

    await mongoose.connect(mongoUri);

    if (!dbInitialized) {
      await initializeDatabase();
      dbInitialized = true;
    }
  })();

  try {
    await dbConnectPromise;
  } catch (error) {
    dbConnectPromise = null;
    throw error;
  }
};

app.use(cors());
app.use(express.json());

app.use(async (req, res, next) => {
  try {
    await ensureDatabaseConnected();
    next();
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

export default app;