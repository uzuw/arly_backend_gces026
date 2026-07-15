import { UA, parsePrice } from './utils.js';

// ponytail: parsePrice handles all currency prefixes consistently

/**
 * Scrape Mobilemandu product listings.
 * Mobilemandu is a Next.js site — requires Playwright for JS rendering.
 */
export async function scrapeMobilemandu(query) {
  console.log(`\n--- Mobilemandu: ${query} ---`);
  const url = `https://mobilemandu.com/search?q=${encodeURIComponent(query)}`;

  const { chromium } = await import('playwright');
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      userAgent: UA,
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(3000);

    // Scroll to trigger lazy-loading
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
    }

    const products = await page.evaluate(() => {
      const selectors = [
        '[class*="product"] a[href*="/product"], a[href*="/p/"]',
        '[class*="grid"] a[href*="/product"], [class*="grid"] a[href*="/p/"]',
        '[class*="card"]',
        'a[class*="product"]',
      ];
      const items = document.querySelectorAll(selectors.join(', '));
      const seen = new Set();
      return Array.from(items)
        .map((el) => {
          const link = el.getAttribute('href') || el.closest('a')?.getAttribute('href') || '';
          const text = el.innerText;
          const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
          const title = lines[0] || '';
          const price = parsePrice(text);
          if (!title || !link || seen.has(link)) return null;
          seen.add(link);
          return { title: title.slice(0, 200), price, description: title.slice(0, 100), link };
        })
        .filter(Boolean);
    });

    for (const p of products) {
      if (p.link && !p.link.startsWith('http')) p.link = 'https://mobilemandu.com' + p.link;
    }

    return {
      site: 'Mobilemandu',
      query,
      scraped_at: new Date().toISOString(),
      url_used: url,
      results: products,
    };
  } catch (err) {
    console.log(`  Mobilemandu error: ${err.message}`);
    return { site: 'Mobilemandu', query, scraped_at: new Date().toISOString(), url_used: url, results: [] };
  } finally {
    if (browser) await browser.close();
  }
}
