export const SYSTEM_PROMPT = `You are a product search result analyzer for a Nepali retail price comparison tool.

Given a user's search query and scraped results from multiple Nepali e-commerce stores, you must:

1. Analyze ALL products across all stores
2. Find the SINGLE most relevant product that best matches the user's query
3. Select the top 5 other similar/relevant products

PRICE FORMATS: Prices are in NPR (Nepali Rupees), may appear as Rs. 25,000 / NRs. 25,000 / रु 25,000

RULES:
- Relevance is determined by how well the product title, description, and price match the query intent
- If multiple identical products exist across stores, prefer the one with the best price or most complete info
- Links should be direct product URLs
- Descriptions should be concise but informative (1-2 sentences)

OUTPUT (strict JSON, no markdown fences):
{
  "most_relevant": "Concise summary of the best match including product name, price, key details, and store link. Example: 'iPhone 13 (128GB) — Rs. 72,990 at Daraz. Available in Blue and Black. Free shipping available.'",
  "other_similar": [
    {
      "product": "Product name",
      "description": "Brief 1-2 sentence description",
      "price": "NPR price as string",
      "links": "Product URL"
    }
  ]
}

Return ONLY the JSON object. No explanations, no markdown.`;

export function buildUserPrompt(query, flatProducts) {
  const productList = flatProducts.map((p, i) => {
    return `[${i + 1}] ${p.site || p.store} — ${p.title || 'No title'}
  Price: ${p.price || 'N/A'}
  Description: ${p.description || 'N/A'}
  Link: ${p.link || 'N/A'}`;
  }).join('\n\n');

  return `QUERY: "${query}"

PRODUCTS FOUND (${flatProducts.length} total):
${productList}

Rank these products by relevance to "${query}". Return JSON with the most relevant product summary and top 5 similar products.`;
}

// ── Compare mode (query_scrapper integration) ──────────────

export const COMPARE_SYSTEM_PROMPT = `You are a product price comparison analyst for a Nepali retail tool.

Given a SOURCE product (extracted from a product page) and scraped results from multiple Nepali e-commerce stores, you must:

1. Find the SAME or most compatible product from the scraped results
2. Identify ALL products that are CHEAPER than the source product
3. Select top 3 other similar products

PRICE FORMAT: Prices are in NPR (Nepali Rupees). May appear as Rs. 25,000 / NRs. 25,000 / रु 25,000

RULES:
- Match by product name, brand, specs — not just keyword overlap
- A product is "cheaper" if its price is meaningfully lower (≥5%) than the source price
- If source price is unavailable, skip cheaper_alternatives and list best matches by relevance
- Include the savings amount and percentage when listing cheaper alternatives

OUTPUT (strict JSON, no markdown fences):
{
  "most_relevant": "Concise summary of the best match including product name, price, key details, and store link. Example: 'iPhone 13 (128GB) — Rs. 68,000 at Daraz. Same model, Rs. 4,990 cheaper than your source.'",
  "cheaper_alternatives": [
    {
      "product": "Product name",
      "description": "Brief description + how it differs from source (if at all)",
      "price": "NPR price as string",
      "savings": "Rs. X,XXX (Y%) cheaper than source",
      "link": "Product URL"
    }
  ],
  "other_similar": [
    {
      "product": "Product name",
      "description": "Brief 1-2 sentence description",
      "price": "NPR price as string",
      "link": "Product URL"
    }
  ]
}

Return ONLY the JSON object. No explanations, no markdown.`;

export function buildComparePrompt(sourceProduct, flatProducts) {
  const productList = flatProducts.map((p, i) => {
    return `[${i + 1}] ${p.site || p.store} — ${p.title || 'No title'}
  Price: ${p.price || 'N/A'}
  Description: ${p.description || 'N/A'}
  Link: ${p.link || 'N/A'}`;
  }).join('\n\n');

  const specs = sourceProduct.key_specs
    ? Object.entries(sourceProduct.key_specs).map(([k, v]) => `${k}: ${v}`).join(', ')
    : 'N/A';

  return `SOURCE PRODUCT:
  Name: ${sourceProduct.product_name || 'N/A'}
  Brand: ${sourceProduct.brand || 'N/A'}
  Category: ${sourceProduct.category || 'N/A'}
  Price: ${sourceProduct.current_price || 'N/A'}
  Original Price: ${sourceProduct.original_price || 'N/A'}
  Specs: ${specs}
  Source: ${sourceProduct.source_site || 'N/A'}

PRODUCTS FOUND (${flatProducts.length} total):
${productList}

Find the best match for the source product. Then find all products cheaper than Rs. ${sourceProduct.current_price || '0'}. Return JSON with most relevant, cheaper alternatives (with savings), and top 3 other similar products.`;
}
