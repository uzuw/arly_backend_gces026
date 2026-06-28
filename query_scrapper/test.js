/**
 * Test the extraction pipeline directly (no server needed)
 * Run: node test.js <url>
 *
 * Example:
 *   node test.js https://www.daraz.com.np/products/some-product.html
 */

import 'dotenv/config';
import { extractProductFromUrl } from './src/pipeline/extractionPipeline.js';

const url = process.argv[2];

if (!url) {
  console.error('Usage: node test.js <product-url>');
  process.exit(1);
}

console.log(`\n🔍 Testing extraction for:\n   ${url}\n`);

const result = await extractProductFromUrl(url);

if (result.success) {
  console.log('✅ SUCCESS');
  console.log(`   Method: ${result.method}`);
  console.log('\n📦 Product:');
  console.log(JSON.stringify(result.product, null, 2));
} else {
  console.log('❌ FAILED');
  console.log(`   Error: ${result.error}`);
  console.log(`   Fallback: ${result.fallback}`);
}
