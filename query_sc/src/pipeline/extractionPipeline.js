import { scrapeUserLink } from '../scraper/linkScraper.js';
import { extractWithLLM, validateExtraction } from '../llm/geminiExtractor.js';
import logger from '../utils/logger.js';

/**
 * Full pipeline: URL → structured product data
 *
 * Flow:
 *  1. Scrape the URL
 *  2. If JSON-LD or OG meta was enough → return directly (no LLM)
 *  3. If raw text → send to Gemini → parse + validate
 *  4. Return normalized product object
 */
export async function extractProductFromUrl(url) {
  const result = await scrapeUserLink(url);

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Could not fetch the URL.',
      fallback: result.fallback || 'manual_input',
    };
  }

  const ctx = result.context;

  // ── Step 2: Already structured (JSON-LD or OG) ──────────────────────────
  if (ctx.method !== 'llm-needed') {
    logger.info(`Skipping LLM — data from ${ctx.method}`);

    const product = enrichWithSearchQueries(ctx);
    return { success: true, product, method: ctx.method };
  }

  // ── Step 3: LLM extraction from raw text ────────────────────────────────
  if (!ctx.raw_text || ctx.raw_text.length < 50) {
    return {
      success: false,
      error: 'Could not extract meaningful content from this page.',
      fallback: 'manual_input',
    };
  }

  let product;
  try {
    product = await extractWithLLM(ctx.raw_text, ctx.source_site);
  } catch (err) {
    return {
      success: false,
      error: `LLM extraction failed: ${err.message}`,
      fallback: 'manual_input',
    };
  }

  // ── Step 4: Validate ─────────────────────────────────────────────────────
  const { valid, errors } = validateExtraction(product);
  if (!valid) {
    logger.warn(`Extraction validation failed: ${errors.join(', ')}`);
    return {
      success: false,
      error: `Could not reliably identify the product (${errors.join(', ')})`,
      fallback: 'manual_input',
    };
  }

  // Attach source info
  product.source_site = ctx.source_site;
  product.source_url = url;

  logger.info(`Product extracted: "${product.product_name}" | Rs. ${product.current_price}`);

  return { success: true, product, method: 'llm' };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * For JSON-LD / OG results that already have structure,
 * generate search_queries if missing.
 */
function enrichWithSearchQueries(context) {
  if (context.search_queries?.length) return context;

  const name = context.product_name || '';
  const brand = context.brand || '';

  const specific = name.slice(0, 80);
  const broad = brand ? `${brand} ${name.split(' ').slice(0, 3).join(' ')}` : name.split(' ').slice(0, 4).join(' ');

  return {
    ...context,
    search_queries: [specific, broad].filter(Boolean),
  };
}
