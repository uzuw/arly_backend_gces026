import { chromium } from 'playwright';
import { parsePrice } from './utils.js';

const BASE = 'https://nagmani.com.np';

/** Apply stealth patches to bypass Cloudflare / bot detection. */
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

/** Parse product cards from the page. */
async function extractProducts(page) {
  return page.evaluate(() => {
    const items = [];

    document.querySelectorAll('li.product-item').forEach((card) => {
      const linkEl = card.querySelector('a.product-item-link');
      const link = linkEl?.href || '';
      if (!link) return;

      const title = linkEl.textContent?.trim() || '';
      if (!title || title.length < 3) return;

      // Price — Magento format: <span class="price">NPR 31,250</span>
      const priceEl = card.querySelector('.price');
      const price = parsePrice(priceEl?.textContent);

      // Image
      const img = card.querySelector('.product-image-photo');
      const image = img?.src || '';

      // Full card text as description
      const description = card.textContent?.replace(/\s+/g, ' ').trim().slice(0, 200) || '';

      items.push({
        title: title.slice(0, 200),
        price,
        link,
        image: image.slice(0, 300),
        description,
      });
    });

    return items;
  });
}

/**
 * Scrape Nagmani International search results (Playwright + stealth).
 *
 * Previously used cheerio+axios — blocked by Cloudflare WAF (403).
 * Playwright with stealth patches bypasses Cloudflare by mimicking a real browser.
 * Uses non-www URL with /catalogsearch/result/?q= endpoint.
 */
export async function scrapeNagmani(query) {
  console.log(`\n--- Nagmani: ${query} ---`);

  const urls = [
    `${BASE}/catalogsearch/result/?q=${encodeURIComponent(query)}`,
    `${BASE}/search?q=${encodeURIComponent(query)}`,
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
          console.log('  Nagmani: blocked by Cloudflare (even with stealth)');
          await page.context().close();
          continue;
        }

        const products = await extractProducts(page);
        await page.context().close();

        if (products.length > 0 || url === urls[urls.length - 1]) {
          console.log(`  Found ${products.length} products`);
          return {
            site: 'Nagmani',
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
      site: 'Nagmani',
      query,
      scraped_at: new Date().toISOString(),
      url_used: urls[0],
      results: [],
    };
  } catch (err) {
    console.log(`  Nagmani error: ${err.message}`);
    return { site: 'Nagmani', query, scraped_at: new Date().toISOString(), url_used: urls[0], results: [] };
  } finally {
    if (browser) await browser.close();
  }
}
