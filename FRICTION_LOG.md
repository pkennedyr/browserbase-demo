# Friction log

One entry per moment of friction, delight, surprise or open question. Target: 20–40 entries.
Jobs: Access | Auth | Self-healing | Extraction | Cost | Evals | Governance | Debugging | Speed | Model choice

Entries marked *(source read)* came from reading the published SDK packages (`@browserbasehq/stagehand@4.1.0`,
`@browserbasehq/sdk@2.21.0`), not from a live run. Confirm them against the docs and the dashboard.

---

**[Fri Sep 25] [Setup] [friction] — your sign-up and upgrade experience (to fill in)**
What happened: _Sign-up → API key → Developer plan. What made you pay, and when? Was the key and project easy to find?_
What I expected:
Job it maps to: Cost
Product idea it suggests:

**[Fri Sep 25] [Setup] [surprise] — the project ID is no longer needed** *(source read)*
What happened: The plan asks for `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID`. In the current SDK, `projectId` is optional on every call ("inferred from the API key"), and the starter repo's README says only the key is needed.
What I expected: Two credentials, as most guides and older blog posts still show.
Job it maps to: Auth (developer onboarding)
Product idea it suggests: Good simplification. Make sure older guides and third-party tutorials stop asking for it; mixed guidance costs first-run minutes.

**[Fri Sep 25] [Setup] [friction] — a zod version mismatch breaks types on day one**
What happened: Stagehand 4.1.0 pins `zod` to exactly `4.4.3`. The starter's `package.json` asks for `^4.4.3`, so a fresh `npm install` pulls a newer zod. The result: a 60-line TypeScript error on the first `extract()` call ("`_zod.version.minor` 4 is not assignable to 6"). Fixed by pinning `zod@4.4.3`.
What I expected: The quickstart template installs clean.
Job it maps to: Extraction (developer experience)
Product idea it suggests: Make zod a peer dependency with a range, or have the scaffolder pin the exact version. The first `extract()` call is the product's "aha" moment; a wall of type errors there is expensive.

**[Fri Sep 25] [Setup] [surprise] — "stealth" has become "verified"** *(source read)*
What happened: In the session API, `browserSettings.advancedStealth` is marked "Deprecated: use `verified` instead." The same setting that used to mean *hide that you're a bot* now means *prove who your bot is*.
What I expected: Stealth and identity to be separate products.
Job it maps to: Access
Product idea it suggests: That's a strategic reframe written into a config flag. Worth asking how many existing stealth users understood the switch, and whether "verified" is available to them on their plan (see `npm run probe:verified`).

**[Fri Sep 25] [Setup] [question] — no `model: "auto"` and no `agent()` in the Stagehand v4 TypeScript SDK** *(source read)*
What happened: The plan calls for `model: "auto"` compared with a pinned model, and for Stagehand's `agent()`. In `@browserbasehq/stagehand@4.1.0`, `model` is `{ modelName, apiKey? }` with a fixed list of provider/model names and no `"auto"`; leaving it out routes through the Model Gateway default. The `Stagehand` class exposes `act`, `observe`, `extract`, `metrics` and `experimentalBatch`, and has no `agent()`. Agents now live in the Browserbase API (`bb.agents.create`, `bb.agents.runs.create`).
What I expected: The v3-era API from blog posts and the build plan.
Job it maps to: Model choice
Product idea it suggests: If the router's `auto` exists only at the Gateway level, say so where developers pick a model. Moving "agent" out of the SDK and into a hosted API also bears on the "one product or three?" question for Phase 4.

**[Fri Sep 25] [Setup] [delight] — cache and usage data come back on every call** *(source read)*
What happened: Every `act`/`observe`/`extract` result carries `metadata.cache` (HIT/MISS/DISABLED, *why* it missed, tokens saved) and `metadata.usage` (input, output, reasoning and cached tokens, inference time). Fetch can return JSON against a schema, not just markdown.
What I expected: To have to estimate tokens myself.
Job it maps to: Cost, Evals
Product idea it suggests: The per-call data exists; the missing piece may be a per-*run* dollar figure. Check whether the dashboard adds it up.

**[Fri Sep 25] [Setup] [delight] — a locked-down machine only needs one allowlist entry**
What happened: This build's cloud container blocks the open web. Because the browser runs in Browserbase's cloud, the code only needs `*.browserbase.com`: the API, the CDP connection, and Fetch for robots.txt. Granola, Wispr, Zoom and the App Store never need to be reachable from where the code runs.
What I expected: To open up every target site.
Job it maps to: Governance
Product idea it suggests: That's an enterprise security selling point: agents in a sandboxed network reach the web through one audited, logged egress point. Pair it with `allowedDomains` (the session-level navigation allowlist in the API) and it becomes a governance story, not just an infrastructure detail.

**[Fri Sep 25] [Phase 1] [friction] — the replay's Events tab shows navigations, not the commands that read the page**
What happened: The Events tab lists CDP commands with their request and response, so `Page.navigate {url}` maps directly to `page.goto()`. That's useful. But on Granola it was the only row. The script also took a full-page screenshot (`Page.captureScreenshot`) and read the HTML and text (`Runtime.evaluate`), and neither appears. The waiting (`waitUntil`, `networkidle`) is Playwright listening for events, so it can't appear as a row, yet it's most of the session time. I had to open `scripts/snapshot.ts` to work out what I was watching.
What I expected: Every command the script sent, on the replay timeline, lined up with the video the way a debugger lines up with source.
Job it maps to: Debugging
Product idea it suggests: Show all CDP commands (or at least a toggle for them) and mark long waits on the timeline. Check in Phase 2 whether the Stagehand tab shows each `extract()` with its instruction. If it does, raw Playwright users get the weaker debugger, and that's a reason to move up a layer.

---

<!-- Template
**[time] [phase] [friction / delight / surprise / question] — short title**
What happened:
What I expected:
Job it maps to:
Product idea it suggests:
-->
