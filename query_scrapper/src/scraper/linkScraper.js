export const VERSION = '1.0.0';

import axios from 'axios';
import { extractProductContext, extractDomain } from './htmlExtractor.js';
import logger from '../utils/logger.js';

const TIMEOUT = parseInt(process.env.SCRAPER_TIMEOUT_MS) || 10000;
const MIN_HTML_LENGTH = 500;

const GENERIC_WORDS = new Set([
  'product', 'item', 'detail', 'p', 'goods', 'new', 'buy', 'shop',
  'store', 'online', 'sale', 'price', 'page',
]);

const SITE_CONFIG = {
  'sastodeal.com':   { startTier: 1 },
  'hamrobazar.com':  { startTier: 2 },
  'daraz.com.np':    { startTier: 2 },
  'hukut.com':       { startTier: 2 },
  'olx.com.np':      { startTier: 2 },
};

function getSiteConfig(domain) {
  for (const [site, config] of Object.entries(SITE_CONFIG)) {
    if (domain.includes(site)) return config;
  }
  return { startTier: 2 };
}

export async function scrapeUserLink(url) {
  validateUrl(url);

  const domain = extractDomain(url);
  const config = getSiteConfig(domain);

  logger.info(`Scraping user link: ${domain}`);

  if (config.startTier === 1) {
    const tier1Result = await tryTier1(url, domain);
    if (tier1Result) return tier1Result;
    logger.info(`tier-1 fell through for ${domain} — slug not descriptive`);
  }

  const tier2Result = await tryTier2(url, domain);
  if (tier2Result) return tier2Result;
  logger.info(`tier-2 fell through for ${domain} — empty/short/failed`);

  const tier3Result = await tryTier3(url, domain);
  if (tier3Result) return tier3Result;
  logger.warn(`tier-3 also failed for ${domain} — all tiers exhausted`);

  return {
    success: false,
    tier: null,
    context: {
      product_name: null,
      search_query: cleanSlug(url),
      raw_text: null,
      source_site: domain,
      method: null,
      current_price: null,
      image_url: null,
    },
    error: 'All extraction tiers failed',
    fallback: 'manual_input',
  };
}

// ── Tier 1: URL Parsing ─────────────────────────────────────────────────────

async function tryTier1(url, domain) {
  try {
    const slug = cleanSlug(url);
    if (!slug || slug.length <= 10) return null;

    const words = slug.split(/\s+/);
    const nonGeneric = words.filter(w => !GENERIC_WORDS.has(w.toLowerCase()));
    if (nonGeneric.length === 0) return null;

    logger.info(`tier-1 (url-parse) succeeded for ${domain}`);

    return {
      success: true,
      tier: 'url-parse',
      context: {
        product_name: null,
        search_query: slug,
        raw_text: null,
        source_site: domain,
        method: 'url-parse',
        current_price: null,
        image_url: null,
      },
      error: null,
      fallback: null,
    };
  } catch (err) {
    logger.warn(`tier-1 error for ${domain}: ${err.message}`);
    return null;
  }
}

function cleanSlug(url) {
  const path = new URL(url).pathname.replace(/\/$/, '');
  const segments = path.split('/').filter(Boolean);
  let slug = segments[segments.length - 1] || '';

  slug = slug.replace(/\.(html|php)$/i, '');
  slug = slug.replace(/-i\d+$/, '');
  slug = slug.replace(/[-_]/g, ' ');

  return slug.trim();
}

// ── Tier 2: Static HTML (Axios) ─────────────────────────────────────────────

async function tryTier2(url, domain) {
  try {
    const html = await fetchWithAxios(url);

    if (!html || html.length < MIN_HTML_LENGTH) {
      logger.info(`tier-2 (static) ${domain}: response too short (${html?.length || 0} chars)`);
      return null;
    }

    const extracted = extractProductContext(html, url);
    logger.info(`tier-2 (static) succeeded for ${domain}: method=${extracted.method}`);

    return buildResult('static', url, domain, extracted);
  } catch (err) {
    logger.warn(`tier-2 (static) failed for ${domain}: ${err.message}`);
    return null;
  }
}

async function fetchWithAxios(url) {
  const res = await axios.get(url, {
    timeout: TIMEOUT,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    maxRedirects: 5,
  });
  return res.data;
}

// ── Tier 3: Playwright ──────────────────────────────────────────────────────

async function tryTier3(url, domain) {
  let browser;
  try {
    const { chromium } = await import('playwright');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT,
    });

    await page.waitForSelector('h1, [class*="price"]', {
      timeout: 5000,
    }).catch(() => {});

    const html = await page.content();

    if (!html || html.length < MIN_HTML_LENGTH) return null;

    const extracted = extractProductContext(html, url);
    logger.info(`tier-3 (playwright) succeeded for ${domain}: method=${extracted.method}`);

    return buildResult('playwright', url, domain, extracted);
  } catch (err) {
    logger.warn(`tier-3 (playwright) failed for ${domain}: ${err.message}`);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

// ── Shared ──────────────────────────────────────────────────────────────────

function buildResult(tier, url, domain, extracted) {
  const searchQuery = extracted.product_name || cleanSlug(url) || domain;

  return {
    success: true,
    tier,
    context: {
      ...extracted,
      search_query: searchQuery,
      source_site: extracted.source_site || domain,
    },
    error: null,
    fallback: null,
  };
}

// ── Validation ──────────────────────────────────────────────────────────────

function validateUrl(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only HTTP/HTTPS URLs are supported');
    }
  } catch (_) {
    throw new Error('Invalid URL provided');
  }
}
