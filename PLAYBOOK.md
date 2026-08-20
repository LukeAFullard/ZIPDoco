# Landing Page Playbook

A reference for giving any app project a proper front page — what it's for, how to structure it, what belongs on it, and how it connects to the actual product. Written as a general playbook, illustrated throughout with TimeDoco's real implementation.

---

## 1. Why a separate landing page at all

The app and the marketing page are different jobs and shouldn't be the same route:

- **The app** is for people who already know what it is and want to use it — it should load fast and get straight to work, with zero explanatory chrome.
- **The landing page** is for everyone else: people arriving from search, a social link, or a friend's recommendation who don't yet know what the product is, whether it's trustworthy, or why it's different from the alternative they already use.

Mixing these means either the app is cluttered with marketing copy, or a first-time visitor lands inside a tool they don't understand yet. Keep them as separate routes.

---

## 2. Project structure

TimeDoco's layout — one static marketing site plus one app, built as separate Vite entry points sharing one repo:

```
/                       ← landing page (marketing, SEO surface)
/app/                   ← the actual product (separate entry point)
/faq/                   ← common questions, also an SEO surface
/blog/                  ← content marketing (index + individual posts)
/privacy/               ← privacy policy
/terms/                 ← terms of use
```

Supporting static files, all at the project root (`public/`):

```
sitemap.xml             ← every public route, for search engines
robots.txt              ← crawler rules + points to sitemap.xml
llms.txt                ← plain-language summary of every page, for AI crawlers/assistants
og-image.png            ← 1200×630 social share preview image
favicon.svg / icons     ← standard favicon + PWA icon set
```

`llms.txt` is a newer, low-effort addition worth adopting generally — a flat markdown file listing every page and a one-line description of what it covers, so an AI assistant summarizing or recommending the product has an accurate, first-party source instead of having to infer from scraped HTML.

Each route is a real, independent static page (own `<title>`, own meta description, own OG/Twitter tags, own JSON-LD if relevant) — not client-side-routed fragments of the app bundle. This matters for SEO (each page is genuinely indexable) and for load speed (a visitor reading the FAQ never downloads the app's JS).

---

## 3. What goes on the landing page

In the order TimeDoco uses them — a reasonable default order for most products:

1. **Header** — wordmark (links home), a couple of top-level nav links (FAQ, Blog, etc.), and one visually distinct **primary CTA button** that launches the app. This nav is identical on every page of the site, so the app is always one click away no matter where a visitor landed.
2. **Hero** — the only section that really matters for a first-time visitor:
   - a short eyebrow/badge (positioning, one line)
   - an H1 that states the *benefit*, not the feature list — avoid leading with technical/negative framing ("no servers, no accounts") in favor of what the user gets
   - one supporting sentence of subhead
   - a primary CTA ("Start using it — free") and a *secondary* CTA that keeps the visitor on the page (anchor-scroll to a features section) rather than sending them away to a FAQ or docs page before they've seen what the product does
3. **Feature grid** — 3-5 cards, each: one short label, one-sentence description. Keep each card scannable in under two seconds; this section is for skimming, not reading.
4. **Comparison table** *(if there's a legible competitive angle)* — feature rows against the obvious alternative(s), only include this if the comparison is honestly favorable and specific ("Local Browser Storage" vs "Centralized Cloud Server"), not vague marketing adjectives.
5. **About / story section** — a short, human, first-person note on why the thing exists. This is disproportionately effective for trust on an indie/small-team product — it's the one part of the page that can't be templated, and it signals there's a real person behind the tool.
6. **Footer** — copyright line, social links, and a second, complete set of links to every route on the site (App, FAQ, Blog, Privacy, Terms, source repo) — a visitor who scrolls all the way down without converting should still be able to get anywhere from here.

Not every product needs all six — the comparison table only makes sense if there's a real competitive story to tell — but hero → features → footer is close to a minimum viable structure.

---

## 4. What the landing page should link to

| Link | Where | Why |
|---|---|---|
| **The app itself** | Header nav (primary button), hero primary CTA, footer | This is the conversion path — see §5, it deserves special treatment. |
| FAQ | Header nav, footer | Answers the objections a visitor has *before* they're willing to commit — keep this reachable, not just linked once. |
| Blog / guides | Header nav, footer | SEO surface + a place to go deeper on things the landing page can't (comparisons, how-tos, use cases) without bloating the hero. |
| Privacy policy | Footer only (rarely nav) | Needs to exist and be findable, doesn't need prominence — over-linking it from the hero paradoxically raises trust questions rather than answering them. |
| Terms of use | Footer only | Same as above. |
| Source repo / socials | Footer only | Credibility signals for the visitors who look for them; not relevant to most, so keep them out of primary nav. |

General rule: **primary nav is for things that help someone decide or convert; footer is for completeness.** If a link doesn't help a first-time visitor understand the product or use it, it belongs in the footer, not the header.

---

## 5. Linking to the app — do this deliberately

The single most important link on the page, so it gets more than one placement and more visual weight than any other link:

- **Header nav:** a filled, high-contrast button (not a plain text link like the other nav items) — "Launch App" / "Open App" / "Start Tracking" — present on every page of the site, not just the homepage, so the app is reachable from the FAQ, the blog, anywhere.
- **Hero primary CTA:** the biggest button on the page, action-phrased ("Start Tracking Now — Free Forever"), removing whatever the main objection is likely to be (cost, signup, commitment) right in the label if it's a strong differentiator.
- **Footer:** included in the link list for completeness, but this is redundant by design — most visitors should never need to scroll this far to find it.

Route it to a real, separate path (`/app/`), not a query param or client-side route toggle off the landing page — this keeps the landing page itself light (it never has to ship the app's JS bundle) and gives the app its own indexable/bookmarkable URL.

---

## 6. SEO & discoverability checklist

All static, all cheap, all worth doing on the landing page (and ideally every top-level route):

- `<title>` and `<meta name="description">` — specific to the page, not the app's internal tagline verbatim
- `<link rel="canonical">` pointing at the real, final URL
- Open Graph tags (`og:title`, `og:description`, `og:image` at 1200×630, `og:url`, `og:type`)
- Twitter Card tags (`twitter:card=summary_large_image`, plus title/description/image)
- JSON-LD structured data (`WebApplication` schema, or whatever fits the product) — helps search engines and AI assistants describe the product accurately instead of guessing
- `sitemap.xml` listing every public route, referenced from `robots.txt`
- `llms.txt` (see §2) — cheap, increasingly worth having
- A real `og-image.png`, not a generic placeholder — this is what shows up when the link is shared, and it's doing marketing work whether or not anyone visits the site

**Keep every one of these in sync when anything changes** — a page title, tagline, or hero headline update is incomplete until the `<title>`, `og:title`, and `twitter:title` all match it. A page that says one thing in its H1 and something else in its social preview reads as unmaintained.

---

## 7. Copy principles for the hero

Worth calling out on its own, since it's the highest-leverage text on the entire site:

- **Lead with the benefit, not the mechanism.** "Stop wrestling with timesheets" beats "time tracking without servers, accounts, or surveillance" — the second is a list of absences, not a reason to care.
- **Don't make the secondary CTA leave the page.** Sending an engaged visitor to a FAQ or docs page from the hero interrupts momentum toward the primary conversion action; an in-page anchor scroll ("See how it works ↓") keeps them moving instead.
- **Match every entry point.** The app's own tagline, the hero headline, the meta title, and the social card titles should all tell the same story — a visitor who sees one framing on social media and a different one when they click through will (correctly) sense something's inconsistent.

---

## 8. Quick reference — starting a new landing page

1. Separate route from the app (`/` vs `/app/`), separate HTML entry, own meta tags.
2. Header: wordmark + a couple of nav links + one prominent "launch the app" button, repeated on every page of the site.
3. Hero: eyebrow → benefit-led H1 → one-line subhead → primary CTA (launch app) + secondary CTA (stay on page).
4. Features grid: 3-5 cards, one line each.
5. Optional: honest comparison table, if there's a real competitive story.
6. About/story section — a few honest, human sentences.
7. Footer: full link set (app, FAQ, blog, privacy, terms, source/socials) + copyright.
8. Ship `sitemap.xml`, `robots.txt`, `llms.txt`, OG/Twitter tags, JSON-LD, and a real social preview image.
9. Whenever copy changes anywhere, check it's consistent everywhere else it's echoed (title tag, OG tags, app tagline).