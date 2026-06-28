import express from 'express';
import { extractProductFromUrl } from '../pipeline/extractionPipeline.js';
import { getVersions } from '../versions.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/extract
 * Body: { url: "https://..." }
 *
 * Returns structured product data ready for the search layer.
 */
router.post('/extract', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'url is required in request body',
    });
  }

  logger.info(`Extract request for: ${url}`);

  try {
    const result = await extractProductFromUrl(url);

    if (!result.success) {
      return res.status(422).json(result);
    }

    return res.json(result);
  } catch (err) {
    logger.error(`Unhandled error in /extract: ${err.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/extract/health
 * Quick health check
 */
router.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), versions: getVersions() });
});

router.get('/versions', (_, res) => {
  res.json(getVersions());
});

const API_VERSION = process.env.APP_VERSION || 'v1';

export { API_VERSION };
export default router;
