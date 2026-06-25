import * as cheerio from 'cheerio';
import { fetchHtml, parsePrice, absoluteUrl } from './utils.js';

const BASE = 'https://hardwarepasal.com';

/** Scrape HardwarePasal product search results (static HTML). */
export async function scrapeHardwarePasal(query) {
  console.log(`\n--- HardwarePasal: ${query} ---`);
  const url = `${BASE}/product?search=${encodeURIComponent(query)}`;

  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const products = [];

    $('.product_outer').each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find('.product__name h4 a');
      const title = titleEl.text().trim();
      const link = absoluteUrl(titleEl.attr('href'), BASE);
      const priceText = $el.find('.product__price').text();
      const price = parsePrice(priceText);
      if (title) products.push({ title, price, description: title, link });
    });

    return {
      site: 'HardwarePasal',
      query,
      scraped_at: new Date().toISOString(),
      url_used: url,
      results: products,
    };
  } catch (err) {
    console.log(`  HardwarePasal error: ${err.message}`);
    return { site: 'HardwarePasal', query, scraped_at: new Date().toISOString(), url_used: url, results: [] };
  }
}
