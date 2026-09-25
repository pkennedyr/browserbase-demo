# Lucca Competitive Radar

A learning build on Browserbase: the same competitor-tracking workflow implemented three ways
(raw Playwright over CDP, Stagehand, and a hosted Browserbase Agent), with a shared runner so the
results compare side by side. The findings go in `FRICTION_LOG.md` and `COMPARISON.md`.

Public pages only, low volume, respect robots.txt and site terms. If a site blocks us, that's a
data point, not something to work around.

## Setup

Requires Node.js 22.18 or newer.

```bash
cp .env.example .env   # paste BROWSERBASE_API_KEY
npm install
npm run typecheck
```

## Network

The browsers run in Browserbase's cloud, so the machine running this code only needs to reach
`*.browserbase.com` (the API plus the regional CDP connect host). The robots.txt check also goes
through Browserbase Fetch. It never contacts the competitor sites directly.

## Run

```bash
npm run snapshot                                   # Phase 1 step 1: save rendered HTML + screenshots
npm run snapshot -- --proxies                      # same, through Browserbase proxies
npm run radar -- --impl playwright                 # Phase 1
npm run radar -- --impl playwright --proxies       # same, through Browserbase proxies
npm run radar -- --impl stagehand --sites granola  # Phase 2, one site
npm run probe:verified                             # can this plan start a Verified browser?
```

Flags: `--impl playwright|stagehand|agent`, `--sites id,id`, `--proxies`, `--no-captchas`,
`--verified`, `--label "note"`.

Each run prints a replay link per session and writes `results/<timestamp>-<impl>.json` with
wall-clock time, success or failure per site, session IDs, browser seconds, proxy bytes, tokens,
and the fields that changed since the previous run of the same implementation.

## Layout

```
competitors.json      sites to track (id, name, siteUrls, appStoreUrl)
schema.ts             the Competitor schema all three implementations extract
run.ts                shared runner: timing, errors, cost lookup, results, diff
lib/                  Browserbase helpers, types, run-to-run diff
impl/playwright/      Phase 1: hand-written selectors over CDP
impl/stagehand/       Phase 2: extract() with the schema
impl/agent/           Phase 4: dashboard Agent triggered through the API
scripts/              snapshot and one-off probes
snapshots/            rendered HTML per page (screenshots stay local)
examples/             the original Stagehand hello-world
```

`claude.md` is the Stagehand v4 API guide for Claude Code sessions in this repo.
