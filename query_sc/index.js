import 'dotenv/config';
import express from 'express';
import routes from './src/api/routes.js';
import logger from './src/utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for frontend dev
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Routes
app.use('/api', routes);

app.listen(PORT, () => {
  logger.info(`SastoBheto backend running on port ${PORT}`);
  logger.info(`POST http://localhost:${PORT}/api/extract`);
});
