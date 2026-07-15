import * as cheerio from 'cheerio';

/**
 * Priority order:
 * 1. JSON-LD structured data
 * 2. Open Graph meta tags
 * 3. Manual DOM extraction
 */

export function extractProductContext(html, url) {
  const $ = cheerio.load(html);
  const domain = extractDomain(url);

  // --- 1. Try JSON-LD first (most reliable) ---
  const jsonLd = tryJsonLd($);
  if (jsonLd) return { ...jsonLd, source_site: domain, method: 'json-ld' };

  // --- 2. Try Open Graph meta tags ---
  const og = tryOpenGraph($);
  if (og.product_name) return { ...og, source_site: domain, method: 'og-meta' };

  // --- 3. Manual DOM extraction → send to LLM ---
  const raw = extractRawText($, domain);
  return { raw_text: raw, source_site: domain, method: 'llm-needed' };
}

// ── JSON-LD ──────────────────────────────────────────────────────────────────
function tryJsonLd($) {
  try {
    const scripts = $('script[type="application/ld+json"]');
    for (let i = 0; i < scripts.length; i++) {
      const json = JSON.parse($(scripts[i]).html());
      const product = findProduct(json);
      if (product) return parseJsonLdProduct(product);
    }
  } catch (_) {}
  return null;
}

function findProduct(json) {
  if (!json) return null;
  if (json['@type'] === 'Product') return json;
  if (Array.isArray(json)) return json.find(j => j['@type'] === 'Product') || null;
  if (json['@graph']) return json['@graph'].find(j => j['@type'] === 'Product') || null;
  return null;
}

function parseJsonLdProduct(p) {
  const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
  return {
    product_name: p.name || null,
    brand: p.brand?.name || p.brand || null,
    description: p.description?.slice(0, 500) || null,
    current_price: offer?.price ? parseInt(offer.price) : null,
    availability: offer?.availability?.includes('InStock') ?? null,
    image_url: Array.isArray(p.image) ? p.image[0] : p.image || 'not available',
  };
}

// ── Open Graph ───────────────────────────────────────────────────────────────
function tryOpenGraph($) {
  const get = (prop) =>
    $(`meta[property="${prop}"]`).attr('content') ||
    $(`meta[name="${prop}"]`).attr('content') || null;

  return {
    product_name: get('og:title') || $('title').text().split('|')[0].trim() || null,
    description: get('og:description'),
    current_price: parsePrice(get('og:price:amount') || get('product:price:amount')),
    image_url: get('og:image') || 'not available',
  };
}

// ── Raw text fallback for LLM ────────────────────────────────────────────────
export function extractRawText($, domain) {
  // Remove noise
  $('script, style, nav, footer, header, iframe, .ads, #ads, .advertisement').remove();

  const blocks = [];

  // Page title
  const title = $('title').text().trim();
  if (title) blocks.push(`PAGE TITLE: ${title}`);

  // Breadcrumbs (good for category)
  const breadcrumb = $('.breadcrumb, nav[aria-label="breadcrumb"], [class*="breadcrumb"]')
    .text().replace(/\s+/g, ' ').trim();
  if (breadcrumb) blocks.push(`BREADCRUMB: ${breadcrumb}`);

  // Product title
  const h1 = $('h1').first().text().trim();
  if (h1) blocks.push(`PRODUCT TITLE: ${h1}`);

  // Price elements - look broadly
  const priceSelectors = [
    '[class*="price"]', '[class*="Price"]',
    '[id*="price"]', '[data-price]',
    '.product-price', '.sale-price', '.current-price'
  ];
  const prices = new Set();
  priceSelectors.forEach(sel => {
    $(sel).each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text && (text.includes('Rs') || text.includes('NPR') || /\d{3,}/.test(text))) {
        prices.add(text.slice(0, 100));
      }
    });
  });
  if (prices.size) blocks.push(`PRICE BLOCK:\n  ${[...prices].slice(0, 4).join('\n  ')}`);

  // Description / specs
  const descSelectors = [
    '[class*="description"]', '[class*="spec"]',
    '[class*="detail"]', '.product-info',
    '#product-description', '[class*="feature"]'
  ];
  const descParts = [];
  descSelectors.forEach(sel => {
    const text = $(sel).text().replace(/\s+/g, ' ').trim();
    if (text.length > 30) descParts.push(text.slice(0, 400));
  });
  if (descParts.length) blocks.push(`DESCRIPTION/SPECS:\n  ${descParts[0]}`);

  // Product image extraction — tiered selectors, then area heuristic, then class heuristic
  const imgSelectors = [
    '[class*="product"] img', '[class*="Product"] img',
    '[id*="product"] img', '[data-testid*="image"] img',
    '.gallery img', '.swiper img', '.carousel img',
    '[class*="zoom"] img', '[class*="lightbox"] img',
    'main img', 'article img',
  ];
  const seen = new Set();
  for (const sel of imgSelectors) {
    $(sel).each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || '';
      if (src && !seen.has(src) && !src.includes('svg') && !src.includes('icon') && !src.includes('logo')) {
        const w = parseInt($(el).attr('width') || '0');
        const h = parseInt($(el).attr('height') || '0');
        if ((w > 0 && w < 50) || (h > 0 && h < 50)) return;
        seen.add(src.startsWith('http') ? src : '');
      }
    });
    if (seen.size) break;
  }
  if (!seen.size) {
    let best = '', bestArea = 0;
    $('body img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      if (!src || src.includes('svg') || src.includes('icon') || src.includes('logo')) return;
      const w = parseInt($(el).attr('width') || '0');
      const h = parseInt($(el).attr('height') || '0');
      if (w * h > bestArea) { bestArea = w * h; best = src; }
    });
    if (best) seen.add(best);
  }
  if (!seen.size) {
    $('img').each((_, el) => {
      const cls = ($(el).attr('class') || '') + ' ' + ($(el).attr('alt') || '');
      if (/product|item|goods|photo|pic/i.test(cls)) {
        const src = $(el).attr('src') || $(el).attr('data-src') || '';
        if (src) seen.add(src);
      }
    });
  }
  const imageUrl = seen.values().next().value || 'not available';
  blocks.push(`PRODUCT IMAGE: ${imageUrl}`);

  return blocks.join('\n\n');
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function parsePrice(str) {
  if (!str) return null;
  const num = parseInt(str.replace(/[^0-9]/g, ''));
  return isNaN(num) ? null : num;
}

export function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch (_) {
    return 'unknown';
  }
}
