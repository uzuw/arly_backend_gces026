import * as cheerio from 'cheerio';
import { fetchHtml, parsePrice, absoluteUrl } from './utils.js';

const BASE = 'https://yantranepal.com';

/** Scrape Yantra Nepal product search results (WooCommerce, static HTML). */
export async function scrapeYantraNepal(query) {
  console.log(`\n--- YantraNepal: ${query} ---`);
  const url = `${BASE}/?s=${encodeURIComponent(query)}&post_type=product`;

  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const products = [];

    $('li.product, div.product, [class*="product"]').each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find('a').first();
      const link = absoluteUrl(linkEl.attr('href'), BASE);
      if (!link || link === BASE) return;

      const title = $el.find('.woocommerce-loop-product__title, h2, h3, [class*="title"]').first().text().trim()
        || linkEl.attr('title') || '';
      if (!title || title.length < 3) return;

      const priceText = $el.find('.price, [class*="price"]').first().text().trim();
      const price = parsePrice(priceText);
      const desc = $el.text().replace(/\s+/g, ' ').trim().slice(0, 120);
      products.push({ title: title.slice(0, 200), price, description: desc, link });
    });

    return {
      site: 'YantraNepal',
      query,
      scraped_at: new Date().toISOString(),
      url_used: url,
      results: products,
    };
  } catch (err) {
    console.log(`  YantraNepal error: ${err.message}`);
    return { site: 'YantraNepal', query, scraped_at: new Date().toISOString(), url_used: url, results: [] };
  }
}
