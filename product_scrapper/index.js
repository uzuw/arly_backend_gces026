/**
 * Product Scraper — Nepali retail store product search.
 * 
 * API mode (default):
 *   npm run dev
 *   POST /search  {"item": "iphone 13"}
 *
 * CLI mode:
 *   node index.js "brush"
 */

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { scrapeBrotherMart } from './src/brothermart.js';
import { scrapeDaraz } from './src/daraz.js';
import { scrapeHamroBazar } from './src/hamrobazar.js';
import { scrapeHardwarePasal } from './src/hardwarepasal.js';
import { scrapeHukut } from './src/hukut.js';
import { scrapeMobilemandu } from './src/mobilemandu.js';
import { scrapeNagmani } from './src/nagmani.js';
import { scrapeOlizStore } from './src/olizstore.js';
import { scrapeSmartDoko } from './src/smartdoko.js';
import { scrapeYantraNepal } from './src/yantranepal.js';

const SCRAPERS = [
  scrapeBrotherMart,
  scrapeDaraz,
  scrapeHamroBazar,
  scrapeHardwarePasal,
  scrapeHukut,
  scrapeMobilemandu,
  scrapeNagmani,
  scrapeOlizStore,
  scrapeSmartDoko,
  scrapeYantraNepal,
];

// ── Helpers ──────────────────────────────────────────────
export async function scrapeAll(query) {
  const results = await Promise.allSettled(
    SCRAPERS.map((fn) => fn(query))
  );

  const combined = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      combined.push(r.value);
    } else if (r.status === 'rejected') {
      console.error('Scraper failed:', r.reason?.message || r.reason);
    }
  }
  return combined;
}

// ── CLI mode ──────────────────────────────────────────────
const queryFromArg = process.argv[2];
if (queryFromArg) {
  const results = await scrapeAll(queryFromArg.trim());
  const total = results.reduce((s, r) => s + r.results.length, 0);
  process.stdout.write(JSON.stringify({ query: queryFromArg.trim(), results }, null, 2));
  process.stderr.write(`\n${total} total products across ${results.length} stores\n`);
  process.exit(0);
}

// ── API mode ──────────────────────────────────────────────
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));

// CORS (configure for your needs)
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['POST', 'GET', 'OPTIONS']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/search', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    scrapers: SCRAPERS.length,
  });
});

// Main search endpoint
app.post('/search',
  body('item')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('item must be a string between 1-100 characters'),
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: errors.array() 
      });
    }

    const { item } = req.body;
    const query = item.trim();
    
    // Log request (for monitoring)
    console.log(`🔍 Search: "${query}" from ${req.ip}`);

    try {
      // Add timeout
      const timeout = setTimeout(() => {
        res.status(504).json({ 
          error: 'Request timeout',
          message: 'Scraping took too long. Please try again.' 
        });
      }, 60000);

      const results = await scrapeAll(query);
      clearTimeout(timeout);

      const total = results.reduce((s, r) => s + r.results.length, 0);

      res.json({
        query,
        scraped_at: new Date().toISOString(),
        total_products: total,
        results,
      });
    } catch (error) {
      console.error('Scraping error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start server ──────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Product scraper API running on http://localhost:${PORT}`);
  console.log(`   POST /search  {"item": "playstation"}`);
  console.log(`   GET  /health`);
});

export default app;