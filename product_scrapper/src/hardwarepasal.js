import * as cheerio from 'cheerio';
import { fetchHtml, parsePrice, absoluteUrl } from './utils.js';

const BASE = 'https://hardwarepasal.com';

/** Scrape HardwarePasal product search results (static HTML). */
export async function scrapeHardwarePasal(query) {
  console.log(`\n--- HardwarePasal: ${query} ---`);
  const url = `${BASE}/product?search=${encodeURIComponent(query)}`;

  try {
    const html = await fetchHtml(url, { timeout: 20_000 });

    if (html.includes('captcha') || html.includes('cf-browser-verify')) {
      console.log('  HardwarePasal: blocked by WAF');
      return { site: 'HardwarePasal', query, url_used: url, results: [], error: 'Blocked by WAF' };
    }

    const $ = cheerio.load(html);
    const products = [];

    $('.product_outer').each((_, el) => {
      const $el = $(el);

      const title = $el.find('.product__name').text().trim();
      if (!title || title.length < 2) return;

      const priceText = $el.find('.product__price').text().trim();
      const price = parsePrice(priceText);

      // Extract link — image anchor is most reliable
      let link = $el.find('.product__image a').attr('href')
        || $el.find('.product__name a').attr('href')
        || '';
      link = absoluteUrl(link, BASE);

      const imgAlt = $el.find('.product__image img').attr('alt') || '';

      products.push({
        title: title.slice(0, 200),
        price,
        link,
        image_alt: imgAlt.slice(0, 120),
      });
    });

    console.log(`  Found ${products.length} products`);
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
