import { UA, parsePrice } from './utils.js';

/**
 * Scrape Hukut (hukut.com) — Nepali gadget/electronics store (Next.js SPA).
 * Requires JavaScript rendering — uses Playwright.
 */
export async function scrapeHukut(query, page = 1) {
  console.log(`\n--- Hukut: ${query} ---`);
  const url = `https://hukut.com/search?q=${encodeURIComponent(query)}&page=${page}`;

  const { chromium } = await import('playwright');
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const pageCtx = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      userAgent: UA,
    });

    await pageCtx.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    // let JS render the product grid
    await pageCtx.waitForTimeout(3000);

    // ponytail: selectors guessed from Tailwind grid — verify against live site
    const products = await pageCtx.evaluate(() => {
      // try common product card selectors
      const selector =
        '[class*="grid"] a[href*="/product/"], a[href*="/p/"], [class*="product"]';
      const items = document.querySelectorAll(selector);
      let results = Array.from(items).map((el) => {
        const link = el.getAttribute('href') || '';
        const text = el.innerText;
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        const title = lines[0] || '';
        const price = parsePrice(text);
        return { title: title.slice(0, 200), price, description: title.slice(0, 100), link };
      });

      // filter noise — require at least a title
      results = results.filter((p) => p.title && p.link);

      // fallback: grab every <a> that has price-like text
      if (results.length === 0) {
        results = Array.from(document.querySelectorAll('a'))
          .filter((el) => /Rs\.?\s*[\d,]/.test(el.innerText))
          .map((el) => {
            const text = el.innerText;
            const link = el.getAttribute('href') || '';
            const title = text.split('\n')[0].trim().slice(0, 200);
            const price = parsePrice(text);
            return { title, price, description: '', link };
          });
      }

      return results;
    });

    // normalise links
    for (const p of products) {
      if (p.link && !p.link.startsWith('http')) {
        p.link = 'https://hukut.com' + p.link;
      }
    }

    return {
      site: 'Hukut',
      query,
      scraped_at: new Date().toISOString(),
      url_used: url,
      results: products,
    };
  } catch (err) {
    console.log(`  Hukut error: ${err.message}`);
    return { site: 'Hukut', query, scraped_at: new Date().toISOString(), url_used: url, results: [] };
  } finally {
    if (browser) await browser.close();
  }
}
