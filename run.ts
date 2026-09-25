import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { sessionCost } from "./lib/browserbase.js";
import { changes, previousRun } from "./lib/diff.js";
import type { Implementation, RunOptions, Site, SiteResult } from "./lib/types.js";

// Usage: npm run radar -- --impl playwright [--sites a,b] [--proxies] [--no-captchas] [--verified] [--label note]
const { values: args } = parseArgs({
  options: {
    impl: { type: "string", default: "stagehand" },
    sites: { type: "string" },
    proxies: { type: "boolean", default: false },
    "no-captchas": { type: "boolean", default: false },
    verified: { type: "boolean", default: false },
    label: { type: "string" },
  },
});

const impls: Record<string, () => Promise<Implementation>> = {
  playwright: async () => (await import("./impl/playwright/index.js")).default,
  stagehand: async () => (await import("./impl/stagehand/index.js")).default,
  agent: async () => (await import("./impl/agent/index.js")).default,
};

async function main() {
  const load = impls[args.impl!];
  if (!load) throw new Error(`Unknown --impl ${args.impl}. Use one of: ${Object.keys(impls).join(", ")}`);
  const impl = await load();

  const all: Site[] = JSON.parse(await readFile("competitors.json", "utf8"));
  const wanted = args.sites?.split(",");
  const sites = all.filter((s) => (wanted ? wanted.includes(s.id) : true) && !s.siteUrl.startsWith("TODO"));
  if (!sites.length) throw new Error("No sites to run. Fill in URLs in competitors.json or check --sites.");

  const opts: RunOptions = {
    proxies: args.proxies!,
    solveCaptchas: !args["no-captchas"],
    verified: args.verified!,
  };
  console.log(`\n▶ ${impl.name} on ${sites.length} site(s)`, opts);

  const started = Date.now();
  const results: SiteResult[] = [];
  for (const site of sites) {
    const t0 = Date.now();
    let result: SiteResult;
    try {
      const { data, usage } = await impl.extract(site, opts);
      result = { siteId: site.id, ok: true, data, usage, wallMs: Date.now() - t0 };
    } catch (err) {
      const e = err as Error & { usage?: SiteResult["usage"] };
      result = { siteId: site.id, ok: false, error: e.message, usage: e.usage ?? { sessionIds: [] }, wallMs: Date.now() - t0 };
    }
    // Sessions are closed by now, so their duration and proxy bytes are final.
    result.sessions = await Promise.all(result.usage.sessionIds.map(sessionCost));
    results.push(result);
    const mark = result.ok ? "✓" : "✗";
    console.log(`  ${mark} ${site.id.padEnd(18)} ${(result.wallMs / 1000).toFixed(1)}s  ${result.error ?? ""}`);
    for (const s of result.sessions) console.log(`      replay: ${s.replayUrl}`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = `${stamp}-${impl.name}.json`;
  const prev = await previousRun("results", impl.name, file);
  const changed = prev ? changes(prev.results, results) : {};

  const sum = (f: (r: SiteResult) => number | undefined) => results.reduce((n, r) => n + (f(r) ?? 0), 0);
  const summary = {
    impl: impl.name,
    label: args.label,
    options: opts,
    startedAt: new Date(started).toISOString(),
    wallMs: Date.now() - started,
    succeeded: results.filter((r) => r.ok).length,
    total: results.length,
    browserSeconds: sum((r) => r.sessions?.reduce((n, s) => n + (s.browserSeconds ?? 0), 0)),
    proxyBytes: sum((r) => r.sessions?.reduce((n, s) => n + (s.proxyBytes ?? 0), 0)),
    inputTokens: sum((r) => r.usage.inputTokens),
    outputTokens: sum((r) => r.usage.outputTokens),
    cachedInputTokens: sum((r) => r.usage.cachedInputTokens),
    llmCalls: sum((r) => r.usage.llmCalls),
    cacheHits: sum((r) => r.usage.cacheHits),
    changedSincePreviousRun: changed,
  };

  await mkdir("results", { recursive: true });
  await writeFile(`results/${file}`, JSON.stringify({ file, summary, results }, null, 2));

  console.log(`\n${summary.succeeded}/${summary.total} succeeded in ${(summary.wallMs / 1000).toFixed(1)}s`);
  console.log(`browser: ${summary.browserSeconds}s  proxy: ${summary.proxyBytes} bytes  tokens in/out/cached: ${summary.inputTokens}/${summary.outputTokens}/${summary.cachedInputTokens}`);
  if (Object.keys(changed).length) console.log("changed since last run:", changed);
  console.log(`wrote results/${file}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
