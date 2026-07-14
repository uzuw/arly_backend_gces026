import 'dotenv/config';
import { extractProductFromUrl } from './src/llm/pipeline.js';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node query_scrapper/test.js <url>');
  process.exit(1);
}

console.log(`Testing extraction for: ${url}\n`);

const result = await extractProductFromUrl(url);

if (result.success) {
  console.log('SUCCESS');
  console.log(`Method: ${result.method}`);
  console.log(JSON.stringify(result.product, null, 2));
} else {
  console.log('FAILED');
  console.log(`Error: ${result.error}`);
}
