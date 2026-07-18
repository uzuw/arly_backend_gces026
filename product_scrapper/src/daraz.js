import { UA, parsePrice } from './utils.js';

// ponytail: inline parsePrice used instead of raw text for consistent formatting

/**
 * Scrape Daraz product listings.
 * Daraz requires JavaScript rendering — uses Playwright.
 */
export async function scrapeDaraz(query, pageNum = 1) {
  console.log(`\n--- Daraz: ${query} ---`);
  const url = `https://www.daraz.com.np/catalog/?q=${encodeURIComponent(query)}&page=${pageNum}`;

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
    await page.waitForSelector('[data-qa-locator="product-item"]', { timeout: 10_000 });

    // scroll to trigger lazy loading
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
    }

    const products = await page.evaluate(() => {
      function parsePrice(text) {
        if (!text) return '';
        const cleaned = text.replace(/,/g, '');
        const m = cleaned.match(/(?:Rs\.?\s*|NPR\.?\s*|NRs\.?\s*|रु\s*)?(\d+(?:\.\d{1,2})?)(?:\s*\/-)?/i);
        if (!m) return '';
        return `Rs. ${Math.round(parseFloat(m[1]))}`;
      }
      const items = document.querySelectorAll('[data-qa-locator="product-item"]');
      return Array.from(items).map((el) => {
        const text = el.innerText;
        const linkEl = el.querySelector('a');
        let link = linkEl?.getAttribute('href') || '';
        if (link && !link.startsWith('http')) link = 'https://www.daraz.com.np' + link;
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        const title = lines.find((l) => !l.includes('Rs.') && l.length > 5) || '';
        const price = parsePrice(lines.find((l) => l.includes('Rs.'))) || '';
        const desc = lines.slice(1).find((l) => !l.includes('Rs.') && l.length > 5) || '';
        return {
          title: title.slice(0, 200),
          price: price,
          description: desc.slice(0, 100),
          link,
        };
      });
    });

    return {
      site: 'Daraz',
      query,
      scraped_at: new Date().toISOString(),
      url_used: url,
      results: products,
    };
  } catch (err) {
    console.log(`  Daraz error: ${err.message}`);
    return { site: 'Daraz', query, scraped_at: new Date().toISOString(), url_used: url, results: [] };
  } finally {
    if (browser) await browser.close();
  }
}
