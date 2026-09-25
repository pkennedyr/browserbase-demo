import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";
import { bb, sessionCost, sessionParams } from "../lib/browserbase.js";
import { robotsAllows } from "../lib/robots.js";
import { urlsOf, type Site } from "../lib/types.js";

// Phase 1, step 1: see each page the way a Browserbase browser sees it.
// Saves rendered HTML (to write selectors against), a screenshot, and signs of
// being blocked. Run once with and once without --proxies and compare.
const { values: args } = parseArgs({
  options: { sites: { type: "string" }, proxies: { type: "boolean", default: false } },
});

const BLOCK_HINTS = /just a moment|access denied|attention required|captcha|are you a robot|verify you are human|unusual traffic/i;

const all: Site[] = JSON.parse(await readFile("competitors.json", "utf8"));
const sites = all.filter((s) => !args.sites || args.sites.split(",").includes(s.id));
const dir = `snapshots/${new Date().toISOString().replace(/[:.]/g, "-")}${args.proxies ? "-proxies" : ""}`;
const report: unknown[] = [];

for (const site of sites) {
  const session = await bb().sessions.create(
    sessionParams({ proxies: args.proxies!, solveCaptchas: true, verified: false }, site.id),
  );
  const browser = await chromium.connectOverCDP(session.connectUrl);
  const page = browser.contexts()[0]!.pages()[0]!;
  console.log(`\n${site.name}  replay: https://www.browserbase.com/sessions/${session.id}`);

  const pages = [];
  for (const [i, url] of urlsOf(site).entries()) {
    const robots = await robotsAllows(url);
    if (!robots.allowed) {
      console.log(`  skip ${url} (${robots.note})`);
      pages.push({ url, skipped: robots.note });
      continue;
    }
    const t0 = Date.now();
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {}); // let JS frameworks render
      const html = await page.content();
      const title = await page.title();
      const text = await page.locator("body").innerText().catch(() => "");
      const base = `${dir}/${site.id}-${i}`;
      await mkdir(dir, { recursive: true });
      await writeFile(`${base}.html`, html);
      await page.screenshot({ path: `${base}.png`, fullPage: true }).catch(() => {});
      const entry = {
        url,
        finalUrl: page.url(),
        status: res?.status(),
        title,
        ms: Date.now() - t0,
        htmlKb: Math.round(html.length / 1024),
        visibleChars: text.length,
        looksBlocked: (res?.status() ?? 200) >= 400 || BLOCK_HINTS.test(title + " " + text.slice(0, 2000)),
        robots: robots.note,
      };
      pages.push(entry);
      console.log(`  ${entry.looksBlocked ? "⚠ BLOCKED?" : "ok"}  ${entry.status}  ${entry.ms}ms  ${entry.htmlKb}KB  "${title}"  ${url}`);
    } catch (err) {
      pages.push({ url, error: (err as Error).message, ms: Date.now() - t0 });
      console.log(`  ✗ ${url}: ${(err as Error).message.split("\n")[0]}`);
    }
  }
  await browser.close();
  report.push({ site: site.id, pages, session: await sessionCost(session.id) });
}

await mkdir(dir, { recursive: true });
await writeFile(`${dir}/report.json`, JSON.stringify(report, null, 2));
console.log(`\nwrote ${dir}/ (HTML, screenshots, report.json)`);
