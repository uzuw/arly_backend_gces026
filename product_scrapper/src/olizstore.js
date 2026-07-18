import { chromium } from 'playwright';
import { parsePrice } from './utils.js';

const BASE = 'https://www.olizstore.com';

/** Apply stealth patches to bypass bot detection (Cloudflare etc.). */
async function stealthPage(browser) {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    // Real browser headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    },
  });

  const page = await context.newPage();

  // Hide automation traces
  await page.addInitScript(() => {
    // @ts-ignore
    delete navigator.__proto__.webdriver;
    // Override chrome property
    // @ts-ignore
    if (!navigator.chrome) navigator.chrome = { runtime: {} };
    // Mock plugins array length
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  return page;
}

/** Parse product cards from the page. */
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

    document.querySelectorAll('.product-item').forEach((card) => {
      const linkEl = card.querySelector('a');
      const link = linkEl?.href || '';
      if (!link) return;

      const titleEl = card.querySelector('.product-title');
      const title = titleEl?.textContent?.trim() || '';
      if (!title) return;

      // Current / sale price
      const priceEl = card.querySelector('.product-price');
      const price = parsePrice(priceEl?.textContent);

      // Original / compare price (for discounts)
      const compareEl = card.querySelector('.product-compare-price');
      const comparePrice = parsePrice(compareEl?.textContent);

      // Image
      const img = card.querySelector('img');
      const image = img?.src || '';

      // Full text for description
      const description = card.textContent?.replace(/\s+/g, ' ').trim().slice(0, 200) || '';

      items.push({
        title: title.slice(0, 200),
        price,
        original_price: comparePrice,
        link,
        image: image.slice(0, 300),
        description,
      });
    });

    return items;
  });
}

/**
 * Scrape OlizStore product search results (Playwright + stealth).
 *
 * Site uses Next.js with static HTML render + Cloudflare protection.
 * Basic HTTP (axios/cheerio) gets blocked — Playwright with stealth patches
 * bypasses Cloudflare by mimicking a real browser.
 */
export async function scrapeOlizStore(query) {
  console.log(`\n--- OlizStore: ${query} ---`);

  const urls = [
    `${BASE}/search?q=${encodeURIComponent(query)}`,
    `${BASE}/catalogsearch/result/?q=${encodeURIComponent(query)}`,
  ];

  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    for (const url of urls) {
      try {
        const page = await stealthPage(browser);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 25_000 });
        await page.waitForTimeout(2000);

        // Check for Cloudflare block
        const title = await page.title();
        const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 500) || '');
        if (
          bodyText.includes('captcha') ||
          bodyText.includes('challenge') ||
          bodyText.includes('cf-browser-verify') ||
          bodyText.includes('Checking your browser') ||
          title.includes('Just a moment')
        ) {
          console.log('  OlizStore: blocked by Cloudflare (even with stealth)');
          await page.context().close();
          continue;
        }

        const products = await extractProducts(page);
        await page.context().close();

        if (products.length > 0 || url === urls[urls.length - 1]) {
          console.log(`  Found ${products.length} products`);
          return {
            site: 'OlizStore',
            query,
            scraped_at: new Date().toISOString(),
            url_used: url,
            results: products,
          };
        }
      } catch (_) {
        // try next URL
      }
    }

    console.log('  No results from any URL');
    return {
      site: 'OlizStore',
      query,
      scraped_at: new Date().toISOString(),
      url_used: urls[0],
      results: [],
    };
  } catch (err) {
    console.log(`  OlizStore error: ${err.message}`);
    return { site: 'OlizStore', query, scraped_at: new Date().toISOString(), url_used: urls[0], results: [] };
  } finally {
    if (browser) await browser.close();
  }
}
