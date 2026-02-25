import app, { ensureDatabaseConnected } from './app.js';
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await ensureDatabaseConnected();
    app.listen(PORT, '0.0.0.0', () => {
      // Server started
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
