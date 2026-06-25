/**
 * Quick test: run all store scrapers with a single product query.
 *
 * Usage:
 *   node product_scrapper/test.js "brush"
 *   npm test "brush"                           (from project root)
 *   npm test                                   (defaults to "brush")
 */

import { scrapeDaraz } from './src/daraz.js';
import { scrapeHardwarePasal } from './src/hardwarepasal.js';
import { scrapeBrotherMart } from './src/brothermart.js';
import { scrapeHamroNirman } from './src/hamronirman.js';

const query = (process.argv[2] || 'brush').trim();
console.log(`\n  Searching "${query}" across all stores...\n${'─'.repeat(50)}`);

const scrapers = [
  { name: 'Daraz',        fn: scrapeDaraz },
  { name: 'HardwarePasal', fn: scrapeHardwarePasal },
  { name: 'BrotherMart',   fn: scrapeBrotherMart },
  { name: 'HamroNirman',   fn: scrapeHamroNirman },
];

const results = [];
for (const { name, fn } of scrapers) {
  const start = Date.now();
  const data = await fn(query);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  ${name}: ${data.results.length} products in ${elapsed}s`);
  results.push(data);
}

console.log(`\n${'═'.repeat(50)}`);
console.log(`  TOTAL: ${results.reduce((s, r) => s + r.results.length, 0)} products found\n`);

// Print first few titles from each store
for (const data of results) {
  if (data.results.length === 0) {
    console.log(`  ${data.site}: (no results)`);
    continue;
  }
  console.log(`  ${data.site} (${data.results.length}):`);
  for (const p of data.results.slice(0, 3)) {
    console.log(`    • ${p.title.slice(0, 70)}  —  ${p.price}`);
  }
  if (data.results.length > 3) console.log(`    ... +${data.results.length - 3} more`);
  console.log();
}
