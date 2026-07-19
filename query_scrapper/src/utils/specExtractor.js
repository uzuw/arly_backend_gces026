// ponytail: flat pattern list, first match wins per spec key.
const SPEC_PATTERNS = [
  { key: 'ram', patterns: [
    /(\d+)\s*GB\s*(?:RAM|Ram|ram|DDR[2345]|LPDDR[2345]|मेमोरी|र्याम)/,
    /(?:RAM|Ram|ram)\s*[:\-]?\s*(\d+\s*GB)/,
    /memory\s*[:\-]?\s*(\d+\s*GB)/,
  ]},
  { key: 'storage', patterns: [
    /(\d+\s*(?:TB|GB))\s*(?:SSD|HDD|NVMe|Storage|ROM|rom|internal|Internal|स्टोरेज)/,
    /(?:SSD|HDD|Storage|ROM)\s*[:\-]?\s*(\d+\s*(?:TB|GB))/,
    /storage\s*[:\-]?\s*(\d+\s*(?:TB|GB))/,
  ]},
  { key: 'processor', patterns: [
    /(Intel\s+Core\s+i[3579][-\s]?\d{1,4}[A-Z0-9]*\s*(?:[A-Z][a-z]+)?)/,
    /(AMD\s+Ryzen\s+[3579]\s*\d{4}[A-Z0-9]*(?:\s*[A-Z][a-z]+)?)/,
    /(Snapdragon\s+\d+\s*(?:Gen\s*\d|Plus|Elite)?)/,
    /(MediaTek\s+(?:Dimensity|Helio)\s+\d+)/,
    /(Apple\s+A\d+\s*(?:Bionic|Fusion|Pro|Ultra)?)/,
    /(Exynos\s+\d+)/,
    /(Google\s+Tensor\s+\w+)/,
    /(Kirin\s+\d+)/,
    /(Unisoc\s+\w+\d+)/,
    /(Intel\s+(?:Pentium\s+\w+|Celeron\s+\w+|Atom\s+\w+|N\d{3,4}))/,
    /(AMD\s+(?:Athlon\s+\w+|A\d{2}[-\s]\d{4}|Sempron|Turion))/,
  ]},
  { key: 'display_size', patterns: [
    /(\d+\.?\d*)\s*(?:inch|इन्च|"|″)(?:\s*(?:FHD|HD|QHD|UHD|4K|AMOLED|OLED|IPS|LCD|TFT|Display|display))?/,
    /(?:display|screen|डिस्प्ले|स्क्रिन|साइज)\s*[:\-]?\s*(\d+\.?\d*)\s*(?:inch|इन्च|"|″)/,
  ]},
  { key: 'display_resolution', patterns: [
    /(?:resolution|रेजोलुसन|रिजोलुसन)\s*[:\-]?\s*(\d{3,4}\s*x\s*\d{3,4})/,
    /(\d{3,4}\s*x\s*\d{3,4})\s*(?:pixels|px|resolution)/,
  ]},
  { key: 'battery', patterns: [
    /(\d{3,5})\s*(?:mAh|mah|MAh|एमएएच)(?:\s*(?:Battery|battery|ब्याट्री))?/,
    /(?:battery|ब्याट्री)\s*[:\-]?\s*(\d{3,5})\s*(?:mAh|mah|एमएएच)/,
  ]},
  { key: 'camera', patterns: [
    /(?:camera|क्यामेरा|क्यामरा)\s*[:\-]?\s*(\d{1,3})\s*(?:MP|Megapixel|मेगापिक्सेल)/,
    /(\d{1,3})\s*(?:MP|Megapixel|मेगापिक्सेल)\s*(?:rear|back|primary|मुख्य|camera)?/,
    /primary\s*(?:camera)?\s*[:\-]?\s*(\d{1,3})\s*(?:MP|Megapixel)/,
  ]},
  { key: 'front_camera', patterns: [
    /(?:front|selfie|फ्रन्ट|सेल्फी)\s*(?:camera|क्यामेरा)?\s*[:\-]?\s*(\d{1,3})\s*(?:MP|Megapixel)/,
    /(\d{1,3})\s*(?:MP)\s*(?:front|selfie)/,
  ]},
  { key: 'os', patterns: [
    /(Android\s*\d+(?:\.\d+)?)/,
    /(iOS\s*\d+(?:\.\d+)?)/,
    /(iPadOS\s*\d+(?:\.\d+)?)/,
    /(Windows\s*\d+\s*(?:Home|Pro|Enterprise|Education|SE|11|10|11 Pro)?)/,
    /(macOS\s*\w+\s*\d+(?:\.\d+)?)/,
    /(HarmonyOS\s*\d+(?:\.\d+)?)/,
  ]},
  { key: 'gpu', patterns: [
    /(NVIDIA\s+(?:GeForce\s+)?(?:RTX|GTX|GT)\s*\d{3,4}\s*(?:Ti|Super|Max-Q)?)/,
    /(AMD\s+Radeon\s+(?:RX\s+)?\d{3,4}\s*(?:XT|X)?)/,
    /(Intel\s+(?:Arc|Iris\s+Xe|UHD|HD)\s*Graphics\s*\w*)/,
    /(Apple\s+(?:M[1234]\s*(?:Pro|Max|Ultra)?)\s*(?:GPU|chip)?)/,
    /(Mali-[A-Z]\d{3})/,
    /(Adreno\s*\d{3,4})/,
  ]},
  { key: 'color', patterns: [
    /color\s*[:\-]?\s*([A-Za-z]+\s*[A-Za-z]*\s*(?:Black|White|Blue|Red|Green|Purple|Gray|Grey|Silver|Gold|Pink))/,
    /\b(Midnight\s+(?:Black|Blue|Green|Purple|Gray))\b/,
    /\b(Space\s+(?:Gray|Grey|Black|Silver))\b/,
    /\b(Starlight|Product\s*Red|Sierra\s+Blue|Alpine\s+Green|Deep\s+Purple|Pacific\s+Blue)\b/,
    /\b(Matte\s+\w+|Glossy\s+\w+)\b/,
  ]},
  { key: 'model', patterns: [
    /\bmodel\s*(?:no|number|#|:)?\s*([A-Z0-9][A-Z0-9\-]{3,15})\b/,
    /\b(MU\w{3,4}[A/Z]\/A)\b/,
  ]},
  { key: 'warranty', patterns: [
    /(\d+)\s*(?:year|years|yr|yrs)\s*(?:warranty|वारेन्टी)/,
    /(?:warranty|वारेन्टी)\s*[:\-]?\s*(\d+)\s*(?:year|years|yr|yrs)/,
  ]},
  { key: 'weight', patterns: [
    /(\d+\.?\d*)\s*(?:kg|KG|Kg|grams|g)\s*(?:weight|वजन|तौल)?/,
    /(?:weight|वजन|तौल)\s*[:\-]?\s*(\d+\.?\d*)\s*(?:kg|KG|Kg)/,
  ]},
  { key: 'connectivity', patterns: [
    /\b(5G|4G\s*LTE|Bluetooth\s*\d+\.?\d*|NFC|WiFi\s*[67]|USB\s*[CT]\s*\d?\.?\d?|Type[-\s][C])\b/,
  ]},
  { key: 'sim', patterns: [
    /(Dual\s*SIM|Nano\s*SIM|eSIM|Dual\s*Nano|Dual\s*5G)/,
  ]},
  { key: 'refresh_rate', patterns: [
    /(\d+)\s*(?:Hz|हर्ट्ज)(?:\s*(?:Refresh\s*Rate|Refresh|रिफ्रेस\s*रेट))?/,
    /(?:refresh\s*rate|रिफ्रेस\s*रेट)\s*[:\-]?\s*(\d+)\s*(?:Hz|हर्ट्ज)/,
  ]},
];

export function extractSpecs(text) {
  if (!text) return {};
  const specs = {};
  for (const { key, patterns } of SPEC_PATTERNS) {
    for (const rx of patterns) {
      const m = text.match(rx);
      if (m) {
        specs[key] = m[1].trim();
        break;
      }
    }
  }
  return specs;
}
