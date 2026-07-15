import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');

export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/** Fetch HTML with Axios — static pages */
export async function fetchHtml(url, opts = {}) {
  const { data } = await axios.get(url, {
    timeout: opts.timeout || 15_000,
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    maxRedirects: 5,
  });
  return data;
}

/** POST form-encoded data and return raw response text */
export async function postForm(url, payload) {
  const { data } = await axios.post(url, payload, {
    timeout: 15_000,
    headers: {
      'User-Agent': UA,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return data;
}

/** Extract NPR price from arbitrary text.
 *  Handles Rs., NPR, NRs, रु prefixes and plain numbers.
 *  Strips commas, drops decimals, returns "Rs. <int>".
 */
export function parsePrice(text) {
  if (!text) return '';
  const cleaned = text.replace(/,/g, '');
  // Rs/NPR/NRs/रु prefix optional, then digits (with optional decimal), then optional /-
  const m = cleaned.match(/(?:Rs\.?\s*|NPR\.?\s*|NRs\.?\s*|रु\s*)?(\d+(?:\.\d{1,2})?)(?:\s*\/-)?/i);
  if (!m) return '';
  return `Rs. ${Math.round(parseFloat(m[1]))}`;
}

/** Normalise relative URLs to absolute */
export function absoluteUrl(href, base) {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  const u = new URL(href, base);
  return u.href;
}

/** Save scraped results as JSON */
export function saveResults(data, filename) {
  if (!filename) {
    const siteKey = data.site.toLowerCase().replace(/\s+/g, '_');
    const queryKey = data.query.replace(/\s+/g, '_');
    filename = path.join(DATA_DIR, `${siteKey}_${queryKey}_results.json`);
  }
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  Saved ${data.results.length} results → ${filename}`);
}
