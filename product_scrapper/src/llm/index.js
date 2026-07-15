import groq from './client.js';
import { MODEL, RANKING_CONFIG } from './models.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts.js';

function stripMarkdownFences(text) {
  return text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
}

async function callGroq(systemMsg, userMsg) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemMsg },
      { role: 'user', content: userMsg },
    ],
    temperature: RANKING_CONFIG.temperature,
    max_tokens: RANKING_CONFIG.max_tokens,
  });
  return completion.choices[0]?.message?.content || '';
}

function flattenResults(scrapedResults) {
  const flat = [];
  for (const store of scrapedResults) {
    const site = store.site || store.url_used || 'Unknown';
    for (const item of (store.results || [])) {
      flat.push({
        site,
        title: item.title || '',
        price: item.price || '',
        description: item.description || '',
        link: item.link || '',
      });
    }
  }
  return flat;
}

export async function summarizeWithLLM(query, scrapedResults) {
  const flatProducts = flattenResults(scrapedResults);

  if (flatProducts.length === 0) {
    return {
      most_relevant: 'No products found for this search.',
      other_similar: [],
    };
  }

  const userMessage = buildUserPrompt(query, flatProducts);

  console.log(`[llm] Ranking ${flatProducts.length} products via Groq (${MODEL})`);

  try {
    const text = await callGroq(SYSTEM_PROMPT, userMessage);
    const cleaned = stripMarkdownFences(text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.warn('[llm] JSON parse failed, retrying with stricter prompt...');
    const retryText = await callGroq(
      SYSTEM_PROMPT,
      `${userMessage}\n\nIMPORTANT: Return ONLY valid JSON. No extra text, no markdown fences, no explanations.`
    );
    return JSON.parse(stripMarkdownFences(retryText));
  }
}
