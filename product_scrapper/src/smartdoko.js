import { chromium } from 'playwright';
import { parsePrice } from './utils.js';

const BASE = 'https://smartdoko.com';

async function stealthPage(browser) {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'Asia/Kathmandu',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    },
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    // @ts-ignore
    delete navigator.__proto__.webdriver;
    // @ts-ignore
    if (!navigator.chrome) navigator.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  return page;
}

async function extractProducts(page) {
  return page.evaluate(() => {
    function parsePrice(text) {
      if (!text) return '';
      const cleaned = text.replace(/,/g, '');
      const m = cleaned.match(/(?:Rs\.?\s*|NPR\.?\s*|NRs\.?\s*|रु\s*)?(\d+(?:\.\d{1,2})?)(?:\s*\/-)?/i);
      if (!m) return '';
      return `Rs. ${Math.round(parseFloat(m[1]))}`;
    }
    const items = [];

    document.querySelectorAll('.product.bordered').forEach((card) => {
      const linkEl = card.querySelector('h4 a');
      const link = linkEl?.href || '';
      if (!link) return;

      const title = linkEl.textContent?.trim() || linkEl.title || '';
      if (!title || title.length < 3) return;

      const priceEl = card.querySelector('.price-new');
      const price = parsePrice(priceEl?.textContent);

      const oldEl = card.querySelector('.price-old');
      const oldPrice = parsePrice(oldEl?.textContent);

      const img = card.querySelector('.cover-image img');
      const image = img?.src || '';

      const description = card.textContent?.replace(/\s+/g, ' ').trim().slice(0, 200) || '';
      const discountEl = card.querySelector('.sale-label span');
      const discount = discountEl?.textContent?.trim().replace(/\s+/g, ' ') || '';

      items.push({
        title: title.slice(0, 200),
        price,
        original_price: oldPrice,
        link,
        image: image.slice(0, 300),
        description,
        discount,
      });
    });

    return items;
  });
}

/**
 * Scrape SmartDoko search results (Playwright + stealth).
 *
 * Site uses Vue.js with static HTML — cheerio selectors missed the actual
 * product cards due to framework-specific class structures.
 * Playwright with direct DOM queries is more reliable.
 */
export async function scrapeSmartDoko(query) {
  console.log(`\n--- SmartDoko: ${query} ---`);

  const url = `${BASE}/search?category=all&q=${encodeURIComponent(query)}&device=desktop`;
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await stealthPage(browser);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25_000 });
    await page.waitForTimeout(2000);

    const products = await extractProducts(page);

    await browser.close();
    console.log(`  Found ${products.length} products`);
    return { site: 'SmartDoko', query, scraped_at: new Date().toISOString(), url_used: url, results: products };
  } catch (err) {
    if (browser) await browser.close();
    console.log(`  SmartDoko error: ${err.message}`);
    return { site: 'SmartDoko', query, scraped_at: new Date().toISOString(), url_used: url, results: [] };
  }
}
