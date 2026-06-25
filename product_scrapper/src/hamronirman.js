import * as cheerio from 'cheerio';
import { fetchHtml, postForm, absoluteUrl } from './utils.js';

const BASE = 'https://www.hamronirman.com';

/**
 * Scrape HamroNirman product search results.
 * First fetches the search page for an anti-forgery token + category ID,
 * then POSTs that to the AJAX endpoint for JSON product data.
 */
export async function scrapeHamroNirman(query, page = 1, perPage = 40) {
  console.log(`\n--- HamroNirman: ${query} ---`);
  const searchUrl = `${BASE}/search?Box=true&q=${encodeURIComponent(query)}`;

  try {
    // Step 1: scrape the search page for the request verification token + category id
    const html = await fetchHtml(searchUrl);
    const $ = cheerio.load(html);
    const token = $('input[name="__RequestVerificationToken"]').val() || '';
    const catId = $('#CategoryId, input[data-val-required*="CategoryId"]').val() || '0';

    // Step 2: POST to the AJAX filters endpoint
    const payload = new URLSearchParams({
      categoryId: catId,
      priceMin: '',
      priceMax: '',
      pageNumber: String(page),
      productsPerPage: String(perPage),
      __RequestVerificationToken: token,
    });

    const raw = await postForm(`${BASE}/AjaxFilters/ReloadFilters`, payload.toString());
    const data = JSON.parse(raw);
    const products = [];

    const items = data?.Data?.AjaxProductsModel?.Products || [];
    for (const item of items) {
      const name = item.Name || item.ProductName || '';
      const priceObj = item.ProductPrice || {};
      const price = `NRs ${priceObj.Price || 0}`;
      const seName = item.SeName || '';
      const link = seName ? `${BASE}/${seName}` : '';
      const desc = item.ShortDescription || '';
      if (name) products.push({ title: name, price, description: desc, link });
    }

    return {
      site: 'HamroNirman',
      query,
      scraped_at: new Date().toISOString(),
      url_used: searchUrl,
      results: products,
    };
  } catch (err) {
    console.log(`  HamroNirman error: ${err.message}`);
    return { site: 'HamroNirman', query, scraped_at: new Date().toISOString(), url_used: searchUrl, results: [] };
  }
}
