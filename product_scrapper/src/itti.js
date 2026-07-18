import { chromium } from 'playwright';
import { parsePrice } from './utils.js';

const BASE = 'https://itti.com.np';

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

/** Extract product cards from the page. */
async function extractProducts(page) {
  return page.evaluate(() => {
    const items = [];
    const seen = new Set();

    // Itti Next.js: products use a[aria-label] with href="/product/..."
    const links = document.querySelectorAll('a[aria-label]');
    for (const a of links) {
      const href = a.getAttribute('href') || '';
      if (!href.includes('/product/')) continue;
      if (seen.has(href)) continue;
      seen.add(href);

      const title = a.getAttribute('aria-label') || a.textContent?.trim() || '';
      if (!title || title.length < 3) continue;

      // Walk up ~3 levels to find the card container with price text
      let container = a;
      for (let i = 0; i < 4; i++) {
        container = container.parentElement;
        if (!container) break;
        if (container.textContent?.includes('रु')) break;
      }

      // Price: find रु (unicode 2352+2369) followed by a number in the container
      const containerText = container?.textContent || '';
      let price = '';
      const rupeeIdx = containerText.indexOf('\u0930\u0941');
      if (rupeeIdx > -1) {
        const after = containerText.slice(rupeeIdx + 2).trimStart();
        const m = after.match(/([\d,]+)/);
        if (m) {
          const num = parseFloat(m[1].replace(/,/g, ''));
          if (!isNaN(num)) price = `Rs. ${Math.round(num)}`;
        }
      }

      // Image
      const img = a.querySelector('img');
      const image = img?.getAttribute('src') || '';

      items.push({
        title: title.slice(0, 200),
        price,
        link: 'https://itti.com.np' + href,
        image: image.slice(0, 300),
        description: '',
      });
    }

    return items;
  });
}

/** Scrape Itti Computer World search results (Playwright + stealth). */
export async function scrapeItti(query) {
  console.log(`\n--- Itti: ${query} ---`);

  const url = `${BASE}/search/result?q=${encodeURIComponent(query)}&category_type=search`;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await stealthPage(browser);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(3000);

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
      console.log('  Itti: blocked by Cloudflare');
      await page.context().close();
      return { site: 'Itti', query, scraped_at: new Date().toISOString(), url_used: url, results: [] };
    }

    const products = await extractProducts(page);
    await page.context().close();

    console.log(`  Found ${products.length} products`);
    return {
      site: 'Itti',
      query,
      scraped_at: new Date().toISOString(),
      url_used: url,
      results: products,
    };
  } catch (err) {
    console.log(`  Itti error: ${err.message}`);
    return { site: 'Itti', query, scraped_at: new Date().toISOString(), url_used: url, results: [] };
  } finally {
    if (browser) await browser.close();
  }
}
