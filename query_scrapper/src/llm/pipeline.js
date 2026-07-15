
import { scrapeUrl } from '../scraper/playwrightScraper.js';
import { extractWithLLM, validateExtraction } from './geminiExtractor.js';

export async function extractProductFromUrl(url) {
  const result = await scrapeUrl(url);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const ctx = result.context;

  // Always go through LLM for consistent English output
  const rawText = ctx.raw_text || buildRawText(ctx);
  if (!rawText || rawText.length < 50) {
    return { success: false, error: 'Could not extract meaningful content from this page.' };
  }

  let product;
  try {
    product = await extractWithLLM(rawText, ctx.source_site);
  } catch (err) {
    return { success: false, error: `LLM extraction failed: ${err.message}` };
  }

  const { valid, errors } = validateExtraction(product);
  if (!valid) {
    return { success: false, error: `Could not reliably identify the product (${errors.join(', ')})` };
  }

  product.source_site = ctx.source_site;
  product.source_url = url;
  product.image_url = ctx.image_url || 'not available';

  return { success: true, product, method: 'llm' };
}

function buildRawText(ctx) {
  const parts = [];
  if (ctx.product_name) parts.push(`Product: ${ctx.product_name}`);
  if (ctx.description) parts.push(`Description: ${ctx.description}`);
  if (ctx.current_price) parts.push(`Price: ${ctx.current_price}`);
  return parts.join('\n');
}

function enrichWithSearchQueries(context) {
  if (context.search_queries?.length) return context;

  const name = context.product_name || '';
  const brand = context.brand || '';
  const specific = name.slice(0, 80);
  const broad = brand
    ? `${brand} ${name.split(' ').slice(0, 3).join(' ')}`
    : name.split(' ').slice(0, 4).join(' ');

  return { ...context, search_queries: [specific, broad].filter(Boolean) };
}
