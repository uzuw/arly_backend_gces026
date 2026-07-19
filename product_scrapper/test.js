/**
 * Quick test: run store scrapers with a single product query.
 *
 * Usage:
 *   node product_scrapper/test.js "brush"      all 8 stores (default)
 *   node product_scrapper/test.js "brush" --phone  best 5 phone/laptop stores
 *   npm test "brush"
 *   npm test                                    defaults to "brush"
 */

import { scrapeBrotherMart } from './src/brothermart.js';
import { scrapeDaraz } from './src/daraz.js';
import { scrapeHardwarePasal } from './src/hardwarepasal.js';
import { scrapeNagmani } from './src/nagmani.js';
import { scrapeOlizStore } from './src/olizstore.js';
import { scrapeSmartDoko } from './src/smartdoko.js';
import { scrapeMudita } from './src/mudita.js';
import { scrapeItti } from './src/itti.js';

const isFocus = process.argv.includes('--phone');
const query = (process.argv[2] || (isFocus ? process.argv[3] : null) || 'brush').trim();
const mode = isFocus ? 'best 5 (phone/laptop)' : 'all 8';
console.log(`\n  Searching "${query}" across ${mode}...\n${'─'.repeat(50)}`);

const ALL = [
  { name: 'Daraz',         fn: scrapeDaraz },
  { name: 'HardwarePasal', fn: scrapeHardwarePasal },
  { name: 'BrotherMart',   fn: scrapeBrotherMart },
  { name: 'SmartDoko',     fn: scrapeSmartDoko },
  { name: 'OlizStore',     fn: scrapeOlizStore },
  { name: 'Nagmani',       fn: scrapeNagmani },
  { name: 'Mudita',        fn: scrapeMudita },
  { name: 'Itti',          fn: scrapeItti },
];

const BEST_5 = [
  { name: 'BrotherMart',  fn: scrapeBrotherMart },
  { name: 'Daraz',        fn: scrapeDaraz },
  { name: 'OlizStore',    fn: scrapeOlizStore },
  { name: 'SmartDoko',    fn: scrapeSmartDoko },
  { name: 'Nagmani',      fn: scrapeNagmani },
];

const scrapers = isFocus ? BEST_5 : ALL;

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
