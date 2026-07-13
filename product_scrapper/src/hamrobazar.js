import * as cheerio from 'cheerio';
import { fetchHtml, parsePrice, absoluteUrl } from './utils.js';

const BASE = 'https://hamrobazaar.com';

/** Scrape HamroBazaar classifieds search results (static HTML, OLX-style). */
export async function scrapeHamroBazar(query) {
  console.log(`\n--- HamroBazar: ${query} ---`);
  const url = `${BASE}/search?q=${encodeURIComponent(query)}`;

  try {
    const html = await fetchHtml(url, { timeout: 20_000 });
    const $ = cheerio.load(html);
    const products = [];

    $('[class*="listing"], [class*="ad"], [class*="card"], [class*="item"], article').each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      if (!text || text.length < 10) return;

      const linkEl = $el.find('a').first();
      const link = absoluteUrl(linkEl.attr('href'), BASE);
      if (!link || link === BASE) return;

      const title = $el.find('h2, h3, h4, [class*="title"]').first().text().trim()
        || linkEl.attr('title') || linkEl.text().trim() || '';
      if (!title || title.length < 3) return;

      const price = parsePrice(text);
      const desc = text.replace(/\s+/g, ' ').trim().slice(0, 120);
      products.push({ title: title.slice(0, 200), price, description: desc, link });
    });

    return {
      site: 'HamroBazar',
      query,
      scraped_at: new Date().toISOString(),
      url_used: url,
      results: products,
    };
  } catch (err) {
    console.log(`  HamroBazar error: ${err.message}`);
    return { site: 'HamroBazar', query, scraped_at: new Date().toISOString(), url_used: url, results: [] };
  }
}
