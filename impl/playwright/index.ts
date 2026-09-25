import { chromium, type Locator, type Page } from "playwright-core";
import { bb, sessionParams } from "../../lib/browserbase.js";
import type { Implementation, Site } from "../../lib/types.js";
import type { Competitor } from "../../schema.js";

// Phase 1: raw Playwright over CDP. Browserbase runs the browser; Playwright
// drives it through the Chrome DevTools Protocol websocket in `connectUrl`.
// Everything about *where the data is on the page* is our problem.

type Scraper = (page: Page, site: Site) => Promise<Partial<Competitor>>;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const uniq = (xs: string[]) => [...new Set(xs.map(clean).filter(Boolean))];

// Several sites render each block twice (desktop and mobile variants) and hide one.
const visibleTexts = async (loc: Locator) => uniq(await loc.filter({ visible: true }).allInnerTexts());

// Click only if the element is there. Banners and "more" buttons come and go.
async function clickIfVisible(loc: Locator, timeout = 3_000): Promise<boolean> {
  try {
    await loc.first().waitFor({ state: "visible", timeout });
    await loc.first().click();
    return true;
  } catch {
    return false;
  }
}

// Read optional text without Playwright's auto-wait. innerText() on a locator that
// matches nothing waits the full 30s default timeout before throwing.
async function textIfPresent(loc: Locator): Promise<string> {
  return (await loc.count()) ? clean(await loc.first().innerText()) : "";
}

async function open(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
}

// "14K Ratings" -> 14000, "3.2M Ratings" -> 3200000. The App Store rounds, so this is approximate.
function parseCount(s: string): number | undefined {
  const m = s.match(/([\d.]+)\s*([KM]?)/i);
  if (!m) return undefined;
  const mult = { K: 1e3, M: 1e6 }[m[2]!.toUpperCase()] ?? 1;
  return Math.round(parseFloat(m[1]!) * mult);
}

// One App Store template serves every app, so one scraper covers all three.
async function appStore(page: Page, url: string): Promise<Partial<Competitor>> {
  await open(page, url);

  // Click: expand the description. Nothing in the schema needs it; it's here to see a click in the replay.
  await clickIfVisible(page.getByRole("button", { name: "more", exact: true }));

  // Ratings badge: <dt>"14K Ratings"</dt> <dd>"5.0"</dd>. The badge's whole text is "14K Ratings 5.0",
  // so match "Ratings" anywhere, not at the end.
  const badge = page.locator("#informationRibbon .badge").filter({ hasText: /\bRatings\b/ });
  const countText = await textIfPresent(badge.locator(".badge-dt"));
  const ratingText = await textIfPresent(badge.locator(".badge-dd .text-container"));

  // Click: open the collapsed "In-App Purchases: Yes" row. Its prices are the only pricing on these pages.
  const iapRow = page.locator("#information dt", { hasText: "In-App Purchases" }).locator("xpath=..");
  const pricing: Competitor["pricing"] = [];
  if (await clickIfVisible(iapRow.locator("summary"))) {
    for (const pair of await iapRow.locator(".text-pair").all()) {
      const [plan = "", price = ""] = (await pair.locator("span").allInnerTexts()).map(clean);
      const period = /annual|year/i.test(plan) ? "year" : /month/i.test(plan) ? "month" : /week/i.test(plan) ? "week" : "unknown";
      pricing.push({ plan, price, period });
    }
  }

  // Apple's privacy label categories, e.g. "Data Linked to You". Declared by the developer, not verified by Apple.
  const privacyLabels = await visibleTexts(page.locator("#privacyTypes h3"));
  const priceAttr = await page.locator("p.attributes").allInnerTexts();

  return {
    appStoreRating: ratingText ? parseFloat(ratingText) : undefined,
    reviewCount: parseCount(countText),
    pricing,
    freeTier: priceAttr.some((a) => /^Free\b/.test(clean(a))),
    privacyClaims: privacyLabels.map((l) => `App Store label: ${l}`),
  };
}

// Merge the marketing-site result over the App Store one, concatenating lists.
function merge(site: Partial<Competitor>, store: Partial<Competitor>): Partial<Competitor> {
  return {
    ...store,
    ...site,
    pricing: [...(site.pricing ?? []), ...(store.pricing ?? [])],
    freeTier: Boolean(site.freeTier || store.freeTier),
    keyFeatures: (site.keyFeatures ?? []).slice(0, 8),
    privacyClaims: uniq([...(site.privacyClaims ?? []), ...(store.privacyClaims ?? [])]),
  };
}

// One hand-written scraper per competitor. Deliberately only three.
// Written against the rendered HTML from `npm run snapshot`.
const scrapers: Record<string, Scraper> = {
  granola: async (page, site) => {
    await open(page, site.siteUrls[0]!);

    // Click: the iubenda cookie banner ("OK with Cookies?"). Reject the optional cookies.
    await clickIfVisible(page.locator("button.iubenda-cs-reject-btn"));

    // Feature cards are <h3>s; the first three repeat for the mobile layout.
    const keyFeatures = await visibleTexts(page.locator("h3"));
    // The privacy claim is a feature card, not a section: find the card by its heading.
    const privacyCard = page.locator("h3", { hasText: /private/i }).locator("xpath=..");
    const privacyClaims = await visibleTexts(privacyCard);
    const freeHeading = await page.locator("h2", { hasText: /for free/i }).count();

    return merge(
      { keyFeatures, privacyClaims, freeTier: freeHeading > 0, pricing: [] },
      site.appStoreUrl ? await appStore(page, site.appStoreUrl) : {},
    );
  },

  wispr: async (page, site) => {
    await open(page, site.siteUrls[0]!);

    // The feature panels sit in a scroll-driven animation (GSAP "pin-spacer") and stay hidden
    // until scrolled into view, so read them whether or not they're visible.
    const keyFeatures = uniq(await page.locator("h3").filter({ hasNotText: /^(Questions|Answer)$/ }).allTextContents());

    // Click: open two FAQ items. Their answers are hidden until clicked.
    const faq = (q: RegExp) => page.locator("[faq-item]").filter({ has: page.locator("[faq-question]", { hasText: q }) });
    const answer = async (q: RegExp) => {
      await clickIfVisible(faq(q).locator("[faq-question]"));
      return textIfPresent(faq(q).locator("[faq-answer]"));
    };
    const freeAnswer = await answer(/Is Flow free/i);
    const privacyAnswer = await answer(/private|secure|data/i);

    // The "Your voice stays yours." section holds the headline privacy claims.
    const privacySection = page.locator("section, div[class*=section]").filter({
      has: page.locator("h2", { hasText: "Your voice stays yours" }),
    });
    const sectionText = await textIfPresent(privacySection);
    const privacyClaims = uniq([...sectionText.split("\n"), ...privacyAnswer.split(/(?<=\.)\s+/)])
      .filter((s) => /data|privacy|SOC|HIPAA|ISO|sell|train|secure/i.test(s));

    return merge(
      { keyFeatures, privacyClaims, freeTier: /^Yes/i.test(freeAnswer), pricing: [] },
      site.appStoreUrl ? await appStore(page, site.appStoreUrl) : {},
    );
  },

  zoom: async (page, site) => {
    // The features page has the pricing table; the landing page repeats it.
    await open(page, site.siteUrls.find((u) => u.includes("ai-note-taking")) ?? site.siteUrls[0]!);

    // Click: the OneTrust cookie banner. It's injected after load, so it isn't in the saved HTML.
    await clickIfVisible(page.locator("#onetrust-reject-all-handler"), 5_000);

    const keyFeatures = await visibleTexts(page.locator("h3").filter({ hasNotText: /^“/ })); // skip quoted testimonials

    // Pricing cards, read once for each billing period. Click: the Monthly/Annually switch.
    // Each card holds both prices; the switch adds `hidden` to one of the two price blocks.
    const readCards = async (period: string) => {
      const out: Competitor["pricing"] = [];
      for (const card of await page.locator(".fdn-zdcm-pricing-card").filter({ visible: true }).all()) {
        const plan = clean(await card.locator(".fdn-zdcm-plan").innerText());
        const price = await textIfPresent(card.locator(".fdn-zdcm-pricing-card-content-body:not(.hidden) .fdn-zdcm-plan-price"));
        if (plan) out.push({ plan, price, period });
      }
      return out;
    };
    const annual = await readCards("month, billed annually"); // e.g. "$8.33 /user/month billed annually"
    let monthly: Competitor["pricing"] = [];
    if (await clickIfVisible(page.locator("label.zdcm-switch"))) {
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {}); // prices reload from /api/price-card
      monthly = await readCards("month");
    }

    const privacyClaims = (await page.locator("body").innerText())
      .split(/(?<=\.)\s+|\n/)
      .map(clean)
      .filter((s) => /stored securely|privacy and security|not use .* to train/i.test(s));

    return merge(
      { keyFeatures, privacyClaims, freeTier: [...annual, ...monthly].some((p) => /free/i.test(p.price)), pricing: [...annual, ...monthly] },
      site.appStoreUrl ? await appStore(page, site.appStoreUrl) : {},
    );
  },
};

const playwright: Implementation = {
  name: "playwright",
  async extract(site, opts) {
    const scrape = scrapers[site.id];
    if (!scrape) throw new Error(`No hand-written selectors for ${site.id}`);

    const session = await bb().sessions.create(sessionParams(opts, site.id));
    const usage = { sessionIds: [session.id] };
    const browser = await chromium.connectOverCDP(session.connectUrl);
    try {
      // Browserbase sessions come with a context and page already open.
      const page = browser.contexts()[0]?.pages()[0] ?? (await browser.contexts()[0]!.newPage());
      const data = await scrape(page, site);
      return { data: { name: site.name, ...data }, usage };
    } catch (err) {
      // Keep the session id on failures so the runner can print the replay link.
      throw Object.assign(err as Error, { usage });
    } finally {
      // Disconnecting ends the session (no keepAlive), which stops the meter.
      await browser.close();
    }
  },
};

export default playwright;
