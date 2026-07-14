import { chromium } from 'playwright';
import { extractProductContext } from './htmlExtractor.js';

const TIMEOUT = parseInt(process.env.SCRAPER_TIMEOUT_MS) || 10000;
const MIN_HTML_LENGTH = 500;

export async function scrapeUrl(url) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.waitForSelector('h1, [class*="price"]', { timeout: 5000 }).catch(() => {});

    const html = await page.content();
    if (!html || html.length < MIN_HTML_LENGTH) {
      return { success: false, error: 'Page content too short' };
    }

    const extracted = extractProductContext(html, url);
    const domain = extractDomain(url);

    return {
      success: true,
      context: { ...extracted, source_site: domain },
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


