import * as linkScraper from './scraper/linkScraper.js';
import * as htmlExtractor from './scraper/htmlExtractor.js';
import * as geminiExtractor from './llm/geminiExtractor.js';
import * as extractionPipeline from './pipeline/extractionPipeline.js';

export const versions = {
  linkScraper: linkScraper.VERSION,
  htmlExtractor: htmlExtractor.VERSION,
  geminiExtractor: geminiExtractor.VERSION,
  extractionPipeline: extractionPipeline.VERSION,
  app: process.env.APP_VERSION || 'v1',
};

export function getVersions() {
  return { ...versions };
}
