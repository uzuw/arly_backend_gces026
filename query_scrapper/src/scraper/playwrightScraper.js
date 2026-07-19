import { chromium } from 'playwright';
import { extractProductContext } from './htmlExtractor.js';

const TIMEOUT = parseInt(process.env.SCRAPER_TIMEOUT_MS) || 15000;
const MIN_HTML_LENGTH = 500;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export async function scrapeUrl(url) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      bypassCSP: true,
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: TIMEOUT });
    await page.waitForTimeout(2000);

    const html = await page.content();
    if (!html || html.length < MIN_HTML_LENGTH) {
      return { success: false, error: 'Page content too short' };
    }

    const extracted = extractProductContext(html, url);
    const domain = extractDomain(url);

    const domImage = await page.evaluate(() => {
      const score = (el) => {
        const w = el.naturalWidth || parseInt(el.getAttribute('width')) || 0;
        const h = el.naturalHeight || parseInt(el.getAttribute('height')) || 0;
        return w * h;
      };

      const isProductImage = (el) => {
        const src = el.src || el.dataset.src || '';
        if (!src || /svg|icon|logo|placeholder|avatar/i.test(src)) return false;
        const cls = (el.className || '') + ' ' + (el.closest('[class*="product"], [class*="gallery"], [class*="swiper"], [class*="carousel"], [class*="zoom"], main, article')?.className || '');
        return /product|gallery|zoom|main|hero|featured/i.test(cls);
      };

      const productImgs = [...document.querySelectorAll('img')].filter(isProductImage);
      if (productImgs.length) {
        return productImgs.sort((a, b) => score(b) - score(a))[0].src;
      }

      const allImgs = [...document.querySelectorAll('img')].filter(el => {
        const src = el.src || '';
        return src && !/svg|icon|logo|placeholder/i.test(src);
      });
      if (allImgs.length) {
        return allImgs.sort((a, b) => score(b) - score(a))[0].src;
      }

      return null;
    });

    return {
      success: true,
      context: {
        ...extracted,
        source_site: domain,
        image_url: extracted.image_url || domImage || 'not available',
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    if (browser) await browser.close();
  }
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch (_) {
    return 'unknown';
  }
}


