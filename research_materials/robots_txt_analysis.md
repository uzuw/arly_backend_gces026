# robots.txt Analysis — Nepal E-commerce Sites

**Date**: 2026-07-07
**Source**: `websites.json` (16 sites)

---

## 1. Daraz (daraz.com.np)
**Status**: ✅ Fetched
**Sitemap**: Not specified
```
User-agent: *
Disallow: /checkout/
Disallow: /customer/
Disallow: /cart/
Disallow: /catalog/
Disallow: /wangpu/
Disallow: /shop/*.htm
Disallow: /*from=
Disallow: /11-11/
Disallow: /11-11-let-the-shopping-begin/
Disallow: /wow/camp/daraz/megascenario/np/11-11-MC/coming-soon
Disallow: /wow/gcp/daraz/megascenario/np/11_11_2020/11-11-let-the-shopping-begin
```
| Direction | Paths |
|-----------|-------|
| ✅ **Allowed** | `/` (root), product pages, search pages, category pages (except `/catalog/`) |
| ❌ **Blocked** | `/checkout/`, `/customer/`, `/cart/`, `/catalog/`, `/wangpu/`, `/shop/*.htm`, `/*from=`, promo/event pages like `/11-11/` |

---

## 2. Sastodeal (sastodeal.com)
**Status**: ❌ Unreachable — server does not respond (connection timeout ×3)
**Notes**: Site itself is also unreachable from this environment. May have regional IP blocking, DDoS protection, or be temporarily down.

---

## 3. HamroBazar (hamrobazar.com)
**Status**: ✅ Fetched (redirects to hamrobazaar.com)
**Sitemap**: `https://hamrobazaar.com/sitemap.xml`
```
User-agent: *
Allow: /
Allow: /detail/
Allow: /user/
Allow: /category/
Allow: /search/product
Allow: /bnpl/
Allow: /FAQ
Allow: /contact
Allow: /help/deactivate
Allow: /posting-rules
Allow: /privacy-policy
Allow: /safety-tips
Allow: /terms
Allow: /boost
Disallow: /api/
Disallow: /profile
Disallow: /settings
Disallow: /boost/
```
| Direction | Paths |
|-----------|-------|
| ✅ **Allowed** | `/detail/`, `/user/`, `/category/`, `/search/product`, `/bnpl/`, `/FAQ`, `/contact`, `/terms`, `/privacy-policy`, `/safety-tips`, `/boost` |
| ❌ **Blocked** | `/api/`, `/profile`, `/settings`, `/boost/` (note: `/boost` allowed but `/boost/` blocked) |

---

## 4. Gyapu (gyapu.com)
**Status**: ✅ Fetched
**Sitemap**: Not specified
```
User-agent: *
Disallow: /404
```
| Direction | Paths |
|-----------|-------|
| ✅ **Allowed** | Everything except `/404` |
| ❌ **Blocked** | `/404` only |

---

## 5. Thulo.com (thulo.com)
**Status**: ✅ Fetched
**Sitemap**: Not specified
```
User-agent: Googlebot
Crawl-delay: 10

User-agent: Bingbot
Crawl-delay: 5

User-agent: Yandex
Crawl-delay: 10
```
| Direction | Paths |
|-----------|-------|
| ✅ **Allowed** | **Everything** — no `Disallow` rules for any user-agent |
| ❌ **Blocked** | None |
| ⏱ **Crawl-delay** | Googlebot: 10s, Bingbot: 5s, Yandex: 10s |

---

## 6. OlizStore (olizstore.com)
**Status**: ✅ Fetched
**Sitemap**: Not specified
```
User-agent: *
Disallow:
Disallow: /checkout
```
| Direction | Paths |
|-----------|-------|
| ✅ **Allowed** | Everything except `/checkout` |
| ❌ **Blocked** | `/checkout` (note: bare `/checkout` only, not `/checkout/` — both may still be blocked by some parsers) |

---

## 7. SmartDoko (smartdoko.com)
**Status**: ✅ Fetched
**Sitemap**: Not specified
```
User-agent: *
Disallow:
```
| Direction | Paths |
|-----------|-------|
| ✅ **Allowed** | **Everything** — `Disallow:` with empty value means no restrictions |
| ❌ **Blocked** | None |

---

## 8. Neshop (neshop.com.np)
**Status**: ✅ Fetched
**Sitemap**: `https://neshop.com.np/sitemap/sitemap.xml`
```
User-agent: *

Disallow: /cart*
Disallow: /bag*
Disallow: /checkout*
Disallow: /thankyou*
Disallow: /user-account*
Disallow: /supplier-dashboard*
Disallow: /partner-dashboard*
Disallow: /admin-dashboard*
Disallow: /reset-password*
Disallow: /email*
Disallow: /media/upload*
Disallow: /media/json*
Disallow: /api*
Disallow: /explore*
```
| Direction | Paths |
|-----------|-------|
| ✅ **Allowed** | Product pages, category pages, search, all public content |
| ❌ **Blocked** | `/cart*`, `/bag*`, `/checkout*`, `/thankyou*`, `/user-account*`, `/supplier-dashboard*`, `/partner-dashboard*`, `/admin-dashboard*`, `/reset-password*`, `/email*`, `/media/upload*`, `/media/json*`, `/api*`, `/explore*` |

---

## 9. Hukut (hukut.com)
**Status**: ✅ Fetched
**Sitemap**: `https://hukut.com/sitemap.xml`
```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /cart
```
| Direction | Paths |
|-----------|-------|
| ✅ **Allowed** | Everything except `/dashboard` and `/cart` |
| ❌ **Blocked** | `/dashboard`, `/cart` |
| ⚠️ **Note** | Hosted behind Cloudflare (per websites.json)—may still rate-limit or challenge scrapers aggressively |

---

## 10. Hardwarepasal (hardwarepasal.com)
**Status**: ✅ Fetched (returns HTTP 200, but content is empty/blank)
**Sitemap**: Not specified
```
User-agent: *
Disallow:
```
| Direction | Paths |
|-----------|-------|
| ✅ **Allowed** | **Everything** — empty robots.txt = no restrictions |
| ❌ **Blocked** | None |

---

## 11. Brother-Mart (brother-mart.com)
**Status**: ✅ Fetched
**Sitemap**: `https://brother-mart.com/sitemap.xml`
**Notes**: Shopify storefront — very extensive robots.txt with UCP/MCP agent instructions
```
User-agent: *
Allow: /
Allow: /products/account
Allow: /products/orders
Allow: /products/checkout
Allow: /collections/account
Allow: /collections/orders
Allow: /collections/checkout
Allow: /pages/checkout
Allow: /blogs/*account
Allow: /blogs/*orders
Allow: /blogs/*checkout
Allow: /account/login

Disallow: /admin
Disallow: /cart/
Disallow: /checkout
Disallow: /checkouts/
Disallow: /orders
Disallow: /account          (except /account/login)
Disallow: /25878626349
Disallow: /cdn/wpm/*.js
Disallow: /services
Disallow: /sf_*
Disallow: /cart.js
Disallow: /recommendations/products
Disallow: /collections/*sort_by*
Disallow: /collections/*+*
Disallow: /collections/*filter*&*filter*
Disallow: /blogs/*+*
Disallow: /*?*ls=*&ls=*
Disallow: /*?*oseid=*
Disallow: /*?*preview_theme_id=*
```
| Direction | Paths |
|-----------|-------|
| ✅ **Allowed** | `/products/account\|orders\|checkout`, `/collections/account\|orders\|checkout`, `/pages/checkout`, `/blogs/*account\|orders\|checkout`, `/account/login` |
| ❌ **Blocked** | `/admin`, `/cart/`, `/checkout`, `/checkouts/`, `/orders`, `/account`, `/services`, `/sf_*`, `/cart.js`, `/recommendations/products`, sort/filter/trap URLs, preview params |

---

## 12. Yantra Nepal (yantranepal.com)
**Status**: ✅ Fetched
**Sitemap**: `https://yantranepal.com/sitemap_index.xml`
```
User-agent: *
Disallow: /wp-content/uploads/wc-logs/
Disallow: /wp-content/uploads/woocommerce_transient_files/
Disallow: /wp-content/uploads/woocommerce_uploads/
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
```
| Direction | Paths |
|-----------|-------|
| ✅ **Allowed** | Everything public (products, categories, etc.) — only wp-admin and WooCommerce internal uploads blocked |
| ❌ **Blocked** | `/wp-content/uploads/wc-logs/`, `/wp-content/uploads/woocommerce_transient_files/`, `/wp-content/uploads/woocommerce_uploads/`, `/wp-admin/` (except `admin-ajax.php`) |
| 🛒 **Note** | WooCommerce-based; `/wp-admin/admin-ajax.php` intentionally allowed for AJAX |

---

## 13. Mobilemandu (mobilemandu.com)
**Status**: ✅ Fetched
**Sitemap**: `https://mobilemandu.com/sitemap.xml`
```
User-agent: *
Allow: /
Disallow: /nogooglebot/
```
| Direction | Paths |
|-----------|-------|
| ✅ **Allowed** | Everything except `/nogooglebot/` |
| ❌ **Blocked** | `/nogooglebot/` (honeypot trap for bad bots) |

---

## 14. Neptronics (neptronics.com)
**Status**: ✅ Fetched
**Sitemap**: `https://neptronics.com/sitemap.xml`
```
User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
```
| Direction | Paths |
|-----------|-------|
| ✅ **Allowed** | Everything public |
| ❌ **Blocked** | `/wp-admin/` (except `admin-ajax.php`) |

---

## 15. Nagmani International (nagmani.com.np)
**Status**: ✅ Fetched
**Sitemap**: `https://nagmani.com.np/sitemap.xml`
**Notes**: Cloudflare-managed with EU Article 4 Content-Signals + custom rules
```
# Content-Signals (Cloudflare Managed)
User-agent: *
Content-Signal: search=yes, ai-train=no, use=reference
Allow: /

# AI crawlers blocked
User-agent: Amazonbot | Applebot-Extended | Bytespider | CCBot | ClaudeBot
User-agent: Google-Extended | GPTBot | meta-externalagent
Disallow: /

# Custom rules
User-agent: *
Disallow: /cgi-bin/
Disallow: /checkout/
Disallow: /customer/
```
| Direction | Paths |
|-----------|-------|
| ✅ **Allowed** | Public pages, search indexing allowed |
| ❌ **Blocked** | `/cgi-bin/`, `/checkout/`, `/customer/` |
| 🤖 **AI crawlers blocked**: | Amazonbot, Applebot-Extended, Bytespider, CCBot, ClaudeBot, Google-Extended, GPTBot, meta-externalagent |
| 🏷 **Content Signal** | Search: yes, AI training: no, AI use: reference only |

---

## 16. Big Digital (bigdigital.com.np)
**Status**: ✅ Fetched
**Sitemap**: `https://bigdigital.com.np/sitemap.xml`
```
User-agent: *
Allow: /
```
| Direction | Paths |
|-----------|-------|
| ✅ **Allowed** | **Everything** — explicit `Allow: /` |
| ❌ **Blocked** | None |

---

## Summary Table

| # | Site | robots.txt | Allowed | Blocked Routes |
|---|------|-----------|---------|----------------|
| 1 | **Daraz** | ✅ Complete | Most public content | `/checkout/`, `/customer/`, `/cart/`, `/catalog/`, `/wangpu/`, promo pages |
| 2 | **Sastodeal** | ❌ Unreachable | Unknown | Unknown |
| 3 | **HamroBazar** | ✅ Complete | `/detail/`, `/category/`, `/search/`, `/user/` etc. | `/api/`, `/profile`, `/settings`, `/boost/` |
| 4 | **Gyapu** | ✅ Minimal | Everything | `/404` only |
| 5 | **Thulo.com** | ✅ Crawl-delay only | **Everything** | None |
| 6 | **OlizStore** | ✅ Minimal | Everything | `/checkout` |
| 7 | **SmartDoko** | ✅ Empty | **Everything** | None |
| 8 | **Neshop** | ✅ Detailed | Public pages | `/cart*`, `/bag*`, `/checkout*`, `/api*`, `/admin*`, `/explore*`, and more |
| 9 | **Hukut** | ✅ Simple | Everything | `/dashboard`, `/cart` |
| 10 | **Hardwarepasal** | ✅ Empty | **Everything** | None |
| 11 | **Brother-Mart** | ✅ Very detailed | Products, collections, blogs, login | `/admin`, `/cart/`, `/checkout`, `/orders`, `/account`, sort/filter traps |
| 12 | **Yantra Nepal** | ✅ WooCommerce | Products, categories | `/wp-admin/`, WooCommerce internal uploads |
| 13 | **Mobilemandu** | ✅ Simple | Everything | `/nogooglebot/` (honeypot) |
| 14 | **Neptronics** | ✅ WordPress | Everything public | `/wp-admin/` |
| 15 | **Nagmani Intl.** | ✅ Cloudflare + custom | Public pages, search allowed | `/cgi-bin/`, `/checkout/`, `/customer/`, all AI crawlers blocked |
| 16 | **Big Digital** | ✅ Allow all | **Everything** | None |

---

## Key Takeaways for Scraping Strategy

### Most Permissive Sites (scrape-friendly)
These sites have **no meaningful restrictions** in robots.txt:
- **Gyapu** — only `/404` blocked
- **Thulo.com** — no disallows at all
- **SmartDoko** — empty robots.txt
- **Hardwarepasal** — empty robots.txt
- **Mobilemandu** — only `/nogooglebot/` (honeypot trap, avoid it)
- **Big Digital** — everything allowed

### Moderate Restrictions
- **OlizStore** — just `/checkout` blocked
- **Yantra Nepal** — only WordPress admin paths blocked
- **Neptronics** — only WordPress admin paths blocked
- **Hukut** — only `/dashboard` and `/cart` blocked

### Restrictive Sites (scrape with care)
- **Daraz** — many disallowed paths, Alibaba-owned with strong anti-bot
- **Neshop** — blocks `/api*`, `/cart*`, `/checkout*`, `/admin*`
- **Brother-Mart** — extensive Shopify rules blocking transactional paths
- **HamroBazar** — blocks `/api/`, `/profile`, `/settings`
- **Nagmani Intl.** — blocks AI crawlers entirely, blocks `/cgi-bin/`, `/checkout/`, `/customer/`

### Unreachable
- **Sastodeal** — could not connect from this environment

### Always observe:
1. **Rate limiting** — respect Crawl-delay directives (Thulo.com: 10s for Googlebot)
2. **Honor AI bot restrictions** — Nagmani explicitly blocks AI training via Content-Signals
3. **Avoid blocked paths** — especially `/api*`, `/checkout*`, `/admin*`, and WordPress admin areas
4. **Check Terms of Service** separately — robots.txt is not the sole legal document
