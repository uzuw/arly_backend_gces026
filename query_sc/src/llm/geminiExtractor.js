import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are a product data extractor for a Nepali retail price comparison tool.

Given scraped content from a Nepali retail website, extract product information and return ONLY a valid JSON object.

CRITICAL PRICE EXTRACTION RULES:
1. Look for prices in this order of priority:
   - Discounted/Sale price (labeled: "offer price", "sale price", "discounted price", "special price")
   - "Current price" or "selling price"
   - "MRP" or "maximum retail price"
   - Any price mentioned in the description
   
2. Price formats to recognize:
   - "Rs. 25,000" or "NRs. 25,000" or "रु 25,000"
   - "25,000/-" or "25,000.00"
   - "रू. 25,000" or "Rs 25000"
   
3. For current_price:
   - ALWAYS use the lowest available price (sale/discounted price)
   - If multiple prices shown, use the discounted one
   - If only one price shown, use that
   - If price has "starting from", use the minimum value
   - If in doubt, extract the most prominent price shown
   - Convert to integer (remove commas, decimals, currency symbols)
   
4. For original_price:
   - Use MRP or original listed price
   - Only set if clearly different from current_price (indicates discount)
   - If same as current_price, set to null

5. If no price found in content, set both to null

JSON schema:
{
  "product_name": "string",
  "brand": "string | null",
  "category": "string",
  "key_specs": { "key": "value" },
  "current_price": number | null,
  "original_price": number | null,
  "availability": boolean | null,
  "search_queries": ["specific query", "broad query"]
}

EXAMPLE:
Input: "Samsung Galaxy S24 Ultra 5G (Titanium, 256GB) Rs. 149,999 MRP: Rs. 159,999"
Output: {
  "product_name": "Samsung Galaxy S24 Ultra 5G",
  "brand": "Samsung",
  "category": "smartphone",
  "key_specs": {"Storage": "256GB", "Color": "Titanium", "Network": "5G"},
  "current_price": 149999,
  "original_price": 159999,
  "availability": true,
  "search_queries": ["Samsung Galaxy S24 Ultra 256GB Titanium", "Samsung Galaxy S24 Ultra"]
}

Additional rules:
- Clean product_name: remove color variants, seller info, promotional text
- key_specs: max 5 most important distinguishing specs as key-value pairs
- search_queries: 2 strings — first specific (with key specs), second broader (brand + model)
- category must be one of: smartphone, laptop, appliance, clothing, grocery, cosmetics, electronics, furniture, beauty, sports, books, other
- If a field cannot be determined, use null`;
/**
 * Extract structured product data from raw scraped text using Gemini.
 */
export async function extractWithLLM(rawText, sourceSite) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `${SYSTEM_PROMPT}

SOURCE SITE: ${sourceSite}

SCRAPED CONTENT:
${rawText}`;

  logger.info(`Sending to Gemini for extraction | chars: ${rawText.length}`);

  let responseText;
  try {
    const result = await model.generateContent(prompt);
    responseText = result.response.text();
  } catch (err) {
    throw new Error(`Gemini API error: ${err.message}`);
  }

  return parseJsonSafely(responseText, model, prompt);
}

/**
 * Parse LLM response — with one retry if JSON is malformed.
 */
async function parseJsonSafely(text, model, originalPrompt) {
  // Attempt 1: direct parse
  try {
    return JSON.parse(text.trim());
  } catch (_) {}

  // Attempt 2: strip markdown fences
  const stripped = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch (_) {}

  // Attempt 3: ask Gemini to fix it
  logger.warn('JSON parse failed, asking Gemini to retry with clean JSON');
  try {
    const fixPrompt = `${originalPrompt}

IMPORTANT: Your previous response was not valid JSON. Return ONLY the raw JSON object, nothing else.`;
    const retry = await model.generateContent(fixPrompt);
    const retryText = retry.response.text().trim();
    return JSON.parse(retryText);
  } catch (err) {
    throw new Error(`Failed to parse LLM response as JSON after retries: ${err.message}`);
  }
}

/**
 * Validate the extracted product has minimum required fields.
 */
export function validateExtraction(product) {
  const errors = [];

  if (!product.product_name) errors.push('missing product_name');
  if (!product.category) errors.push('missing category');
  if (!product.search_queries?.length) errors.push('missing search_queries');

  return {
    valid: errors.length === 0,
    errors,
  };
}
