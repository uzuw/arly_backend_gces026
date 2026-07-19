import * as cheerio from 'cheerio';

/**
 * Priority order:
 * 1. JSON-LD structured data
 * 2. Open Graph meta tags
 * 3. Aggressive DOM extraction (multi-strategy price fallback)
 * 4. Raw text → LLM extraction
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

  // --- 3. Aggressive DOM extraction (multi-strategy price fallback) ---
  const dom = tryDomExtraction($);
  if (dom.product_name || dom.current_price) {
    return { ...dom, source_site: domain, method: 'dom-fallback' };
  }

  // --- 4. Raw text → LLM extraction ---
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
      if (product) {
        const parsed = parseJsonLdProduct(product);
        // ponytail: skip JSON-LD with no name or garbage-only name
        if (parsed.product_name && !isGarbageBrand(parsed.brand)) return parsed;
        // Name found but brand is garbage — return with name, clear brand
        if (parsed.product_name) {
          parsed.brand = null;
          return parsed;
        }
      }
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
    current_price: parsePrice(offer?.price),
    original_price: parsePrice(offer?.priceSpecification?.price) || null,
    availability: offer?.availability?.includes('InStock') ?? null,
    image_url: Array.isArray(p.image) ? p.image[0] : p.image || 'not available',
  };
}

// ── DOM multi-strategy fallback ──────────────────────────────────────────────
function tryDomExtraction($) {
  const name = extractDomProductName($);
  const price = extractDomPrice($);
  const originalPrice = extractDomOriginalPrice($, price);
  const brand = extractDomBrand($);
  const desc = extractDomDescription($);
  const image = extractDomImage($);

  return {
    product_name: name,
    brand,
    description: desc,
    current_price: price,
    original_price: originalPrice,
    availability: extractDomStock($),
    image_url: image || 'not available',
  };
}

function extractDomProductName($) {
  return (
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text().trim() ||
    $('[itemprop="name"]').first().text().trim() ||
    $('[class*="product"] h1, [class*="Product"] h1').first().text().trim() ||
    $('[class*="product-name"], [class*="productName"], [class*="product_title"]').first().text().trim() ||
    $('title').text().split('|')[0].split('-')[0].trim() ||
    null
  );
}

function extractDomBrand($) {
  return (
    $('[itemprop="brand"] [itemprop="name"]').first().text().trim() ||
    $('[itemprop="brand"]').first().text().trim() ||
    $('[class*="brand"], [class*="vendor"], [class*="manufacturer"]').first().text().trim() ||
    null
  );
}

function extractDomDescription($) {
  return (
    $('[itemprop="description"]').first().text().trim().slice(0, 500) ||
    $('meta[name="description"]').attr('content')?.slice(0, 500) ||
    $('[class*="description"], [class*="Description"]').first().text().trim().slice(0, 500) ||
    null
  );
}

function extractDomImage($) {
  const sel = [
    '[itemprop="image"]',
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    '[class*="product"] img', '[class*="gallery"] img',
    'main img', 'article img',
  ];
  for (const s of sel) {
    const src = $(s).first().attr('content') || $(s).first().attr('src') || $(s).first().attr('data-src');
    if (src && !/svg|icon|logo|placeholder/i.test(src)) return src;
  }
  // Largest img heuristic
  let best = '', bestArea = 0;
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (!src || /svg|icon|logo|placeholder/i.test(src)) return;
    const w = parseInt($(el).attr('width')) || 0;
    const h = parseInt($(el).attr('height')) || 0;
    const area = w * h || 1;
    if (area > bestArea) { bestArea = area; best = src; }
  });
  return best || null;
}

function extractDomStock($) {
  const txt = (
    $('[itemprop="availability"]').first().text() ||
    $('link[itemprop="availability"]').attr('href') ||
    $('[class*="stock"], [class*="availability"], [class*="status"]').first().text()
  );
  if (!txt) return null;
  return (/in.?stock|available|in_stock|instock/i.test(txt) ? true :
          /out.?of.?stock|discontinued|unavailable/i.test(txt) ? false : null);
}

function extractDomPrice($) {
  const candidates = [];

  // Tier 1: Schema.org / structured attributes
  addCandidate(candidates, 'itemprop:price', $(['[itemprop="price"]', 'meta[itemprop="price"]'].join(',')).first());

  // Tier 2: Price meta tags (OG, Twitter, generic)
  for (const sel of ['meta[property="product:price:amount"]', 'meta[property="og:price:amount"]', 'meta[name="price"]']) {
    const el = $(sel).first();
    const val = el.attr('content');
    if (val) candidates.push({ source: 'meta', val: parsePrice(val), raw: val });
  }

  // Tier 3: Data attributes
  for (const attr of ['data-price', 'data-product-price', 'data-sale-price', 'data-current-price']) {
    $(`[${attr}]`).each((_, el) => {
      const val = $(el).attr(attr);
      if (val) candidates.push({ source: `data:${attr}`, val: parsePrice(val), raw: val });
    });
  }

  // Tier 4: Known price CSS selectors (ordered by reliability)
  const priceSelectors = [
    '.price-new', '.sale-price', '.special-price', '.offer-price',
    '.product-price', '.current-price', '.selling-price', '.final-price',
    '.our-price', '.discounted-price', '.price-box .price',
    '.product__price', '.product-sale-price',
    '.price-wrapper .price', '.price .amount',
    '[class*="salePrice"]', '[class*="currentPrice"]',
    'span.price', '.price',
    '[class*="price"]', '[class*="Price"]',
  ];
  const seenText = new Set();
  for (const sel of priceSelectors) {
    $(sel).each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (!text || seenText.has(text) || !/\d{2,}/.test(text)) return;
      seenText.add(text);
      candidates.push({ source: `css:${sel}`, val: parsePrice(text), raw: text });
    });
    if (candidates.filter(c => c.val).length >= 3) break;
  }

  // Tier 5: Nepali price regex patterns in body text
  const bodyHtml = $('body').html() || $('body').text();
  const regexPatterns = [
    /Rs\.?\s*[,\s]*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi,
    /NRs\.?\s*[,\s]*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi,
    /NPR\.?\s*[,\s]*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi,
    /रु\s*[,\s]*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi,
    /(\d{1,3}(?:,\d{3})+)\s*\/?\-/g,
  ];
  for (const pat of regexPatterns) {
    pat.lastIndex = 0;
    let m;
    while ((m = pat.exec(bodyHtml)) !== null) {
      const val = parsePrice(m[1]);
      if (val && !candidates.some(c => c.val === val)) {
        candidates.push({ source: `regex:${pat.source.slice(0, 20)}`, val, raw: m[0] });
      }
    }
  }

  // Tier 6: Price in product title / h1
  const h1text = $('h1').first().text();
  if (h1text) {
    const m = h1text.match(/(?:Rs\.?\s*|NPR\.?\s*|NRs\.?\s*|रु\s*)?(\d{2,}(?:,\d{3})*(?:\.\d{1,2})?)/i);
    if (m) {
      const val = parsePrice(m[1]);
      if (val) candidates.push({ source: 'h1', val, raw: m[0] });
    }
  }

  // Consolidation: collect all valid numeric prices, find most frequent
  const valid = candidates.filter(c => c.val !== null && c.val > 0 && c.val < 10_000_000);
  if (!valid.length) return null;

  // Group similar prices (within 5% = same cluster)
  const clusters = {};
  for (const c of valid) {
    const key = Math.round(c.val / 50) * 50;
    if (!clusters[key]) clusters[key] = [];
    clusters[key].push(c.val);
  }

  let bestCluster = null;
  let bestCount = 0;
  for (const [key, vals] of Object.entries(clusters)) {
    if (vals.length > bestCount) {
      bestCount = vals.length;
      bestCluster = parseInt(key);
    }
  }

  // Prefer high-priority sources if they agree with the cluster
  const highPriority = valid.filter(c =>
    c.source.startsWith('itemprop') || c.source === 'meta' || c.source.startsWith('data:')
  );
  if (highPriority.length) {
    const aligned = highPriority.find(c => Math.abs(c.val - bestCluster) / bestCluster < 0.1);
    if (aligned) return aligned.val;
    return highPriority[0].val;
  }

  return bestCluster;
}

function extractDomOriginalPrice($, currentPrice) {
  const candidates = [];

  // Direct selectors for original/MRP price
  const originalSelectors = [
    'meta[property="product:original_price:amount"]',
    'meta[property="product:sale_price:amount"]',
    '[itemprop="priceSpecification"] [itemprop="price"]',
    '.price-old', '.old-price', '.regular-price', '.original-price',
    '.price-old .price', '.old-price .price',
    '[class*="old-price"]', '[class*="original-price"]',
    '[class*="regular-price"]', '[class*="list-price"]',
    '[class*="msrp"]', '[class*="strikethrough"]',
    'del .price', 'del[class*="price"]', 's .price', 's[class*="price"]',
    '.price-box .old-price',
    '.product__price--old', '.product-old-price',
  ];
  const seen = new Set();
  for (const sel of originalSelectors) {
    $(sel).each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim() || $(el).attr('content') || '';
      if (!text || seen.has(text)) return;
      seen.add(text);
      const val = parsePrice(text);
      if (val && val > 0 && val < 10_000_000) candidates.push(val);
    });
  }

  // Also look for a higher price in the same page that differs from current_price
  if (!candidates.length && currentPrice) {
    const bodyText = $('body').text();
    const allPrices = [...bodyText.matchAll(/(?:Rs\.?\s*|NPR\.?\s*|NRs\.?\s*|रु\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi)]
      .map(m => parsePrice(m[1]))
      .filter(v => v && v > currentPrice && v < 10_000_000 && v / currentPrice < 10 && v / currentPrice > 1.01);

    if (allPrices.length) {
      // Sort by proximity to current price (higher but not too high)
      allPrices.sort((a, b) => Math.abs(a / currentPrice - 1.3) - Math.abs(b / currentPrice - 1.3));
      return allPrices[0];
    }
  }

  return candidates.length ? Math.max(...candidates) : null;
}

function addCandidate(arr, source, $el) {
  if (!$el.length) return;
  const val = $el.attr('content') || $el.text().trim();
  if (val) arr.push({ source, val: parsePrice(val), raw: val });
}

// ── Open Graph ───────────────────────────────────────────────────────────────
function tryOpenGraph($) {
  const get = (prop) =>
    $(`meta[property="${prop}"]`).attr('content') ||
    $(`meta[name="${prop}"]`).attr('content') || null;

  const product_name = get('og:title') || $('title').text().split('|')[0].trim() || null;
  const brand = get('product:brand') || get('og:brand') || null;
  const current_price = parsePrice(get('og:price:amount') || get('product:price:amount'));

  // Only accept OG as authoritative when BOTH name and price are found
  // (many sites fill og:title with generic site name, not product name)
  const isReliable = product_name && current_price;

  return isReliable ? {
    product_name,
    description: get('og:description'),
    brand: isGarbageBrand(brand) ? null : brand,
    current_price,
    original_price: parsePrice(get('product:original_price:amount') || get('product:sale_price:amount')) || null,
    availability: get('product:availability') === 'in stock' || null,
    image_url: get('og:image') || 'not available',
  } : { product_name: null };
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

  // Brand
  const brandEl = $('[class*="brand"], [itemprop="brand"], [class*="vendor"]').first().text().trim();
  if (brandEl) blocks.push(`BRAND: ${brandEl}`);

  // Stock / availability
  const stockEl = $('[class*="stock"], [class*="availability"], [class*="status"]').first().text().trim();
  if (stockEl && /stock|avail|out|discontinued/i.test(stockEl)) {
    blocks.push(`AVAILABILITY: ${stockEl.slice(0, 80)}`);
  }

  // Price elements - look broadly
  const priceSelectors = [
    '[class*="price"]', '[class*="Price"]',
    '[id*="price"]', '[data-price]',
    '.product-price', '.sale-price', '.current-price',
    '[class*="discount"]', '[class*="saving"]',
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
  if (prices.size) blocks.push(`PRICES:\n  ${[...prices].slice(0, 5).join('\n  ')}`);

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
  const cleaned = String(str).replace(/[^0-9.]/g, '');
  const num = Math.round(parseFloat(cleaned));
  return isNaN(num) ? null : num;
}

// ponytail: flat list of known bogus brand values from site metadata errors
const GARBAGE_BRANDS = new Set([
  'facebook', 'twitter', 'instagram', 'whatsapp',
  'google-site-verification', 'none', 'n/a', 'na', 'unknown',
  'demo', 'test', 'brand', 'default',
]);

function isGarbageBrand(brand) {
  if (!brand) return true;
  const lower = brand.toLowerCase().trim();
  return GARBAGE_BRANDS.has(lower) || lower.length > 30 || lower.length < 2;
}

export function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch (_) {
    return 'unknown';
  }
}
