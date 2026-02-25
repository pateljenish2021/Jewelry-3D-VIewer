import app, { ensureDatabaseConnected } from '../app.js';

export default async function handler(req, res) {
  try {
    await ensureDatabaseConnected();
    return app(req, res);
  } catch (error) {
    console.error('❌ API handler error:', error);
    return res.status(500).json({ error: 'Server initialization failed' });
  }
}