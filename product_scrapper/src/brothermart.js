import * as cheerio from 'cheerio';
import { fetchHtml, absoluteUrl } from './utils.js';

const BASE = 'https://brother-mart.com';

/** Scrape BrotherMart product search results (static HTML). */
export async function scrapeBrotherMart(query) {
  console.log(`\n--- BrotherMart: ${query} ---`);
  const url = `${BASE}/search?q=${encodeURIComponent(query)}`;

  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const products = [];

    $('article.product-card').each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find('a.product-card__media, a[aria-label]').first();
      const link = absoluteUrl(linkEl.attr('href'), BASE);
      let title = linkEl.attr('aria-label') || '';
      if (!title) title = $el.find('a[aria-label]').attr('aria-label') || '';
      const price = $el.find('.price').text().trim();
      const desc = $el.text().replace(/\s+/g, ' ').trim().slice(0, 120);
      if (title) products.push({ title, price, description: desc, link });
    });

    return {
      site: 'BrotherMart',
      query,
      scraped_at: new Date().toISOString(),
      url_used: url,
      results: products,
    };
  } catch (err) {
    console.log(`  BrotherMart error: ${err.message}`);
    return { site: 'BrotherMart', query, scraped_at: new Date().toISOString(), url_used: url, results: [] };
  }
}
