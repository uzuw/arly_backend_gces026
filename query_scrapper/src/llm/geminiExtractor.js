
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_INSTRUCTION = `You are a product data extractor for a Nepali retail price comparison tool.

CRITICAL PRICE EXTRACTION RULES:
1. Look for prices in this order of priority:
   - Discounted/Sale price (highest priority)
   - Current price or selling price
   - MRP or maximum retail price
   - Any price mentioned in the description

2. Price formats supported: Rs. 25,000 / NRs. 25,000 / रु 25,000 / 25,000/-
   - Convert all prices to NPR (Nepali Rupees)
   - If price is in another currency, convert to NPR

3. For current_price: Extract the actual selling price as integer
4. For original_price: Use MRP/list price, null if same as current_price
5. Remove all commas, currency symbols, and non-numeric characters
6. If no price found, set both to null

AVAILABILITY RULES:
1. If product is out of stock → availability: false
2. If product is in stock → availability: true  
3. If cannot determine → availability: null

JSON SCHEMA (strict):
{
  "product_name": "string (required)",
  "brand": "string | null",
  "category": "string (required - must be: laptop, mobile, electronics, accessory)",
  "key_specs": { "key": "value" },
  "current_price": number | null,
  "original_price": number | null,
  "availability": boolean | null,
  "search_queries": ["specific query", "broad query"] (required, min 2)
}

OUTPUT RULES:
- Return ONLY valid JSON
- No markdown, no explanations
- Translate any non-English text to English
- All fields must match the schema exactly`;

const MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

async function groqChat(systemMsg, userMsg, temperature = 0.1) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemMsg },
      { role: 'user', content: userMsg },
    ],
    temperature,
    max_tokens: 2048,
  });
  const text = completion.choices[0]?.message?.content || '';
  // Strip markdown fences if present
  return text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
}

export async function extractWithLLM(rawText, sourceSite = 'unknown') {
  const userMessage = `SOURCE SITE: ${sourceSite}

SCRAPED CONTENT:
${rawText}`;

  console.log(`[llm] Sending to Groq (${MODEL}) | chars: ${rawText.length}`);

  const cleaned = await groqChat(SYSTEM_INSTRUCTION, userMessage, 0.1);

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.warn('[llm] JSON parse failed, retrying with lower temperature...');

    const retryText = await groqChat(
      SYSTEM_INSTRUCTION,
      `${userMessage}\n\nIMPORTANT: Return ONLY the raw JSON object, nothing else.`,
      0.05
    );

    return JSON.parse(retryText);
  }
}

export function validateExtraction(product) {
  if (!product || typeof product !== 'object') {
    return { valid: false, errors: ['No product data returned'] };
  }

  const errors = [];

  if (!product.product_name || typeof product.product_name !== 'string') {
    errors.push('Missing or invalid product_name');
  }

  if (product.current_price !== null && product.current_price !== undefined && typeof product.current_price !== 'number') {
    errors.push('current_price must be a number or null');
  }

  if (product.original_price !== null && product.original_price !== undefined && typeof product.original_price !== 'number') {
    errors.push('original_price must be a number or null');
  }

  if (product.category && !['laptop', 'mobile', 'electronics', 'accessory'].includes(product.category)) {
    errors.push('Invalid category');
  }

  return { valid: errors.length === 0, errors };
}
