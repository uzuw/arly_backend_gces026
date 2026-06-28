/**
 * Product Scraper — Nepali retail store product search.
 *
 * Usage:
 *   node product_scrapper/index.js "brush"
 *   node product_scrapper/index.js "iphone 13"       (no args → defaults to "brush")
 *
 * Output: individual JSON files per store in data/,
 *         plus a combined all_<query>_results.json in the scraper root.
 */

import { scrapeDaraz } from './src/daraz.js';
import { scrapeHardwarePasal } from './src/hardwarepasal.js';
import { scrapeBrotherMart } from './src/brothermart.js';
import { scrapeHamroNirman } from './src/hamronirman.js';
import { saveResults } from './src/utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCRAPERS = [
  scrapeDaraz,
  scrapeHardwarePasal,
  scrapeBrotherMart,
  scrapeHamroNirman,
];

async function main() {
  const query = (process.argv[2] || 'brush').trim();
  const combined = [];

  for (const scrape of SCRAPERS) {
    const data = await scrape(query);
    combined.push(data);
    saveResults(data);
  }

  const outPath = path.join(__dirname, `all_${query.replace(/\s+/g, '_')}_results.json`);
  fs.writeFileSync(outPath, JSON.stringify(combined, null, 2), 'utf-8');
  console.log(`\nAll results → ${outPath}`);
}

main().catch(console.error);
