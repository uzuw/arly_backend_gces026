import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { extractProductFromUrl } from './src/llm/pipeline.js';

const app = express();
const PORT = process.env.LLM_PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Routes ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ 
    message: 'LLM extraction server is running',
    endpoints: {
      'POST /': 'Extract product data from URL',
      'GET /health': 'Health check'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    model: 'llama-3.1-8b-instant'
  });
});

app.post('/', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing url in request body' 
    });
  }

  console.log(`[api] POST /  url=${url}`);

  try {
    const result = await extractProductFromUrl(url);
    res.json(result);
  } catch (error) {
    console.error('[api] Extraction error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Extraction failed'
    });
  }
});

// ── 404 handler ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found' 
  });
});

// ── Error handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[api] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ── Start server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 LLM extraction server running on http://localhost:${PORT}`);
  console.log(`   POST /  { "url": "https://example.com/product" }`);
  console.log(`   GET  /health`);
});