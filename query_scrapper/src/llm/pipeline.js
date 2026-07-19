
import { scrapeUrl } from '../scraper/playwrightScraper.js';
import { extractWithLLM, validateExtraction } from './geminiExtractor.js';
import { extractSpecs } from '../utils/specExtractor.js';

export async function extractProductFromUrl(url) {
  const result = await scrapeUrl(url);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const ctx = result.context;

  if (ctx.method === 'json-ld') {
    const specText = [ctx.product_name, ctx.brand, ctx.description].filter(Boolean).join(' ');
    const product = {
      product_name: ctx.product_name || null,
      brand: ctx.brand || null,
      category: guessCategory(ctx.product_name || '', ctx.brand || '', ctx.source_site || ''),
      key_specs: extractSpecs(specText),
      current_price: ctx.current_price ?? null,
      original_price: ctx.original_price ?? null,
      availability: ctx.availability ?? null,
      search_queries: buildSearchQueries(ctx.product_name, ctx.brand),
      source_site: ctx.source_site,
      source_url: url,
      image_url: ctx.image_url || 'not available',
    };
    return { success: true, product, method: 'json-ld' };
  }

  if (ctx.method === 'og-meta' && ctx.product_name && ctx.current_price) {
    const specText = [ctx.product_name, ctx.brand, ctx.description].filter(Boolean).join(' ');
    const product = {
      product_name: ctx.product_name,
      brand: ctx.brand || null,
      category: guessCategory(ctx.product_name, '', ctx.source_site || ''),
      key_specs: extractSpecs(specText),
      current_price: ctx.current_price,
      original_price: ctx.original_price ?? null,
      availability: ctx.availability ?? null,
      search_queries: buildSearchQueries(ctx.product_name, ctx.brand),
      source_site: ctx.source_site,
      source_url: url,
      image_url: ctx.image_url || 'not available',
    };
    return { success: true, product, method: 'og-meta' };
  }

  // --- 3. DOM fallback (multi-strategy price extraction) ---
  if (ctx.method === 'dom-fallback') {
    const specText = [ctx.product_name, ctx.brand, ctx.description].filter(Boolean).join(' ');
    if (ctx.current_price) {
      const product = {
        product_name: ctx.product_name,
        brand: ctx.brand || null,
        category: guessCategory(ctx.product_name || '', ctx.brand || '', ctx.source_site || ''),
        key_specs: extractSpecs(specText),
        current_price: ctx.current_price,
        original_price: ctx.original_price ?? null,
        availability: ctx.availability ?? null,
        search_queries: buildSearchQueries(ctx.product_name, ctx.brand),
        source_site: ctx.source_site,
        source_url: url,
        image_url: ctx.image_url || 'not available',
      };
      return { success: true, product, method: 'dom-fallback' };
    }
    // Has name but no price → build enriched raw text with DOM data for LLM
    const enriched = buildRawText(ctx);
    const rawFallback = ctx.raw_text || enriched;
    if (rawFallback.length >= 50) {
      return tryLlmExtraction(rawFallback, ctx, url);
    }
  }

  const rawText = ctx.raw_text || buildRawText(ctx);
  if (!rawText || rawText.length < 50) {
    return { success: false, error: 'Could not extract meaningful content from this page.' };
  }
  return tryLlmExtraction(rawText, ctx, url);
}

async function tryLlmExtraction(rawText, ctx, url) {
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
  product.key_specs = { ...extractSpecs(rawText), ...(product.key_specs || {}) };
  return { success: true, product, method: 'llm' };
}

function buildRawText(ctx) {
  const parts = [];
  if (ctx.product_name) parts.push(`Product: ${ctx.product_name}`);
  if (ctx.brand) parts.push(`Brand: ${ctx.brand}`);
  if (ctx.description) parts.push(`Description: ${ctx.description}`);
  if (ctx.current_price) parts.push(`Current Price: ${ctx.current_price}`);
  if (ctx.original_price) parts.push(`Original Price: ${ctx.original_price}`);
  if (ctx.availability === true) parts.push('Availability: In Stock');
  if (ctx.availability === false) parts.push('Availability: Out of Stock');
  return parts.join('\n');
}

function guessCategory(name, brand, site) {
  const lower = `${name} ${brand} ${site}`.toLowerCase();
  if (/laptop|notebook|thinkpad|chromebook|macbook/i.test(lower)) return 'laptop';
  if (/\bsmartphone\b|\biphone\b|\bipad\b|\btablet\b|\bgalaxy\s+(s|a|z|note|m|f|tab)\b|\bphone\b/i.test(lower)) return 'mobile';
  if (/accessor|cable|charger|case|cover|screen\s?guard|headphon|earphone|speaker|mouse|keyboard/i.test(lower)) return 'accessory';
  return 'electronics';
}

// ponytail: flat list, extend as needed
const GARBAGE_BRANDS = new Set([
  'facebook', 'twitter', 'instagram', 'n/a', 'na', 'none', 'unknown',
  'default', 'brand', 'demo', 'test',
]);

function isGarbageBrand(b) {
  if (!b) return true;
  const lower = b.toLowerCase().trim();
  return GARBAGE_BRANDS.has(lower) || lower.length > 30 || lower.length < 2;
}

function buildSearchQueries(name, brand) {
  const specific = (name || '').slice(0, 80);
  const cleanBrand = isGarbageBrand(brand) ? null : brand;
  const broad = cleanBrand
    ? `${cleanBrand} ${(name || '').split(' ').slice(0, 3).join(' ')}`
    : (name || '').split(' ').slice(0, 4).join(' ');
  return [specific, broad].filter(Boolean);
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
