import * as cheerio from 'cheerio';
import { fetchHtml, absoluteUrl, parsePrice } from './utils.js';

const BASE = 'https://mudita.com.np';

/** Scrape Mudita (Magento 2 store) search results — static HTML, no Cloudflare. */
export async function scrapeMudita(query) {
  console.log(`\n--- Mudita: ${query} ---`);
  const url = `${BASE}/catalogsearch/result/?q=${encodeURIComponent(query)}`;

  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const products = [];

    // Magento 2 standard product cards
    $('li.product-item, .product-item').each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find('a.product-item-link').first();
      const link = absoluteUrl(linkEl.attr('href'), BASE);
      const title = linkEl.text().trim();
      if (!title || title.length < 3) return;

      // Magento price: <span class="price">NPR 127,499</span> or special/wrapper price
      const priceEl = $el.find('.price-wrapper .price, .price-box .price, .price').first();
      const price = parsePrice(priceEl.text());

      // Image
      const img = $el.find('.product-image-photo, img.product-image-photo, img').first();
      const image = absoluteUrl(img.attr('src') || img.attr('data-src') || '', BASE);

      // Description snippet
      const desc = $el.text().replace(/\s+/g, ' ').trim().slice(0, 200);

      if (title) products.push({ title: title.slice(0, 200), price, link, image: image.slice(0, 300), description: desc });
    });

    // Fallback: try dataLayer JSON embedded in the page (reliable structured data)
    if (products.length === 0) {
      const scriptMatch = html.match(/var\s+dlObjects\s*=\s*(\[[\s\S]*?\]);/);
      if (scriptMatch) {
        try {
          const dlObjects = JSON.parse(scriptMatch[1]);
          for (const obj of dlObjects) {
            const impressions = obj?.ecommerce?.impressions || [];
            for (const item of impressions) {
              if (item.name && item.price) {
                products.push({
                  title: item.name.slice(0, 200),
                  price: parsePrice(String(item.price)),
                  link: '',  // dataLayer doesn't include URLs
                  image: '',
                  description: item.category || '',
                });
              }
            }
          }
        } catch (_) { /* JSON parse fail — skip */ }
      }
    }

    console.log(`  Found ${products.length} products`);
    return {
      site: 'Mudita',
      query,
      scraped_at: new Date().toISOString(),
      url_used: url,
      results: products,
    };
  } catch (err) {
    console.log(`  Mudita error: ${err.message}`);
    return { site: 'Mudita', query, scraped_at: new Date().toISOString(), url_used: url, results: [] };
  }
}
