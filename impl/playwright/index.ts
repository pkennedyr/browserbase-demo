import { chromium, type Page } from "playwright-core";
import { bb, sessionParams } from "../../lib/browserbase.js";
import type { Implementation, Site } from "../../lib/types.js";
import type { Competitor } from "../../schema.js";

// Phase 1: raw Playwright over CDP. Browserbase runs the browser; Playwright
// drives it through the Chrome DevTools Protocol websocket in `connectUrl`.
// Everything about *where the data is on the page* is our problem.

type Scraper = (page: Page, site: Site) => Promise<Partial<Competitor>>;

// One hand-written scraper per competitor. Deliberately only three.
// Written against the rendered HTML from `npm run snapshot`.
const scrapers: Record<string, Scraper> = {
  // granola: async (page, site) => { ... },
  // wispr: async (page, site) => { ... },
  // zoom: async (page, site) => { ... },
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
