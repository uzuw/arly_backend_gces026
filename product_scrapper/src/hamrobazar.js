import { chromium } from 'playwright';
import { parsePrice } from './utils.js';

const BASE = 'https://hamrobazaar.com';

/**
 * Scrape HamroBazaar search results via Playwright (React SPA — dynamic content).
 *
 * Falls back to cheerio won't work because the site loads results via JS.
 */
export async function scrapeHamroBazar(query) {
  console.log(`\n--- HamroBazar: ${query} ---`);
  const url = `${BASE}/search/product?q=${encodeURIComponent(query)}&Latitude=0&Longitude=0`;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'networkidle', timeout: 25_000 });
    // Scroll a bit to trigger lazy rendering
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(3000);

    const products = await page.evaluate(() => {
      const items = [];

      // Each listing is a div with this class pattern (React + Tailwind)
      const priceSpans = document.querySelectorAll(
        'span.text-sm.font-semibold.text-on-surface-dim-1'
      );

      priceSpans.forEach((priceSpan) => {
        // Walk up to the listing root (around 5 levels up)
        let root = priceSpan;
        for (let i = 0; i < 5; i++) {
          if (root.parentElement) root = root.parentElement;
        }

        const text = root.textContent?.trim() || '';
        if (!text || text.length < 20) return;

        // Extract link
        const linkEl = root.querySelector('a');
        const link = linkEl?.href || '';
        if (!link) return;

        // Extract title from img alt (most reliable) or link text
        const img = root.querySelector('img');
        const title =
          img?.alt?.trim()
          || linkEl.textContent?.trim()
          || '';
        if (!title || title.length < 2) return;

        // Normalize price
        const priceRaw = priceSpan.textContent?.trim() || '';
        const price = parsePrice(priceRaw);

        // Condition / status
        const conditionMatch = text.match(
          /(Brand New|Like New|Used|Not Working|For Parts)/i
        );
        const condition = conditionMatch ? conditionMatch[1] : '';

        // Location
        let location = '';
        // Try to find location in the text — it's typically after the condition
        const textParts = text.split('\n').map((s) => s.trim()).filter(Boolean);
        for (let i = 0; i < textParts.length; i++) {
          if (
            /(?:Brand New|Like New|Used|Not Working)/i.test(textParts[i])
            && i + 1 < textParts.length
            && textParts[i + 1].length > 5
          ) {
            location = textParts[i + 1];
            break;
          }
        }

        // Description — text between title and price
        const desc = text
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 200);

        items.push({
          title: title.slice(0, 200),
          price,
          link,
          description: desc,
          condition,
          location: location.slice(0, 100),
        });
      });

      return items;
    });

    console.log(`  Found ${products.length} products`);
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
  } finally {
    if (browser) await browser.close();
  }
}
