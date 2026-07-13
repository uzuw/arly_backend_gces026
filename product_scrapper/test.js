/**
 * Quick test: run all store scrapers with a single product query.
 *
 * Usage:
 *   node product_scrapper/test.js "brush"
 *   npm test "brush"                           (from project root)
 *   npm test                                   (defaults to "brush")
 */

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

const query = (process.argv[2] || 'brush').trim();
console.log(`\n  Searching "${query}" across all stores...\n${'─'.repeat(50)}`);

const scrapers = [
  { name: 'Daraz',         fn: scrapeDaraz },
  { name: 'HardwarePasal', fn: scrapeHardwarePasal },
  { name: 'BrotherMart',   fn: scrapeBrotherMart },
  { name: 'Hukut',         fn: scrapeHukut },
  { name: 'SmartDoko',     fn: scrapeSmartDoko },
  { name: 'YantraNepal',   fn: scrapeYantraNepal },
  { name: 'HamroBazar',    fn: scrapeHamroBazar },
  { name: 'OlizStore',     fn: scrapeOlizStore },
  { name: 'Nagmani',       fn: scrapeNagmani },
  { name: 'Mobilemandu',   fn: scrapeMobilemandu },
]
// Run in parallel
const results = await Promise.all(
  scrapers.map(async ({ name, fn }) => {
    const start = Date.now();
    const data = await fn(query);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ${name}: ${data.results.length} products in ${elapsed}s`);
    return data;
  })
);

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
    console.log(`    \u2022 ${p.title.slice(0, 70)}  —  ${p.price}`);
  }
  if (data.results.length > 3) console.log(`    ... +${data.results.length - 3} more`);
  console.log();
}
