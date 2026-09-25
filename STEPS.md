# Steps: where we are

The build plan as a checklist. Claude updates this file as we go.
Rendered view: https://claude.ai/artifact/HR63EHy37HhAF6ptbVtg5S (built from `steps.html`).
**▶ marks the current step.** Findings go in `FRICTION_LOG.md` and `COMPARISON.md`, not here.

Legend: `[x]` done · `[ ]` to do · `▶` you are here

---

## Setup

- [x] Scaffold the project: shared runner, schema, three implementation folders, results
- [x] Pick competitors: Granola, Wispr Flow, Zoom (marketing URLs, deliberately no pricing pages)
- [x] Start `FRICTION_LOG.md` with setup entries
- [ ] **You:** fill in the sign-up and upgrade entry at the top of the friction log (what made you pay, and when)
- [x] Confirm `BROWSERBASE_API_KEY` works (the project ID isn't needed)
- [x] Check the current docs against the scripts (session create, proxies, Verified): they match

## Phase 1: raw Playwright over CDP

Learning: how brittle selectors are, what getting blocked looks like, how good replay is for debugging.

- [x] **1.1** `npm run snapshot`: rendered HTML and screenshots of every page, no proxies
- [x] **1.2** **You:** open the replays and say what you notice (before Claude explains)
- [x] **1.3** `npm run snapshot -- --proxies`: refused with 402, because proxies aren't on the Free plan (the account is on Free)
- [ ] **1.4** Blocked until the account upgrades. Compare the two snapshots: blocks, load times, proxy bytes, what changed on the page
- [x] **1.5** `npm run probe:verified`: refused with 403, "only available on the Enterprise plan"
- [ ] **1.6** Log friction entries from 1.1–1.5
- [x] **1.7** Write hand-coded selectors and clicks for the 3 competitors in `impl/playwright/` (time how long it takes). Clicks: dismiss cookie banners, expand App Store "more" and ratings, open Zoom's feature tabs. No clicking through to pricing; that's saved for Stagehand in Phase 2.
- [x] **1.8** `npm run radar -- --impl playwright`: first extraction run. 2 of 3 marked succeeded; Zoom failed on its pricing cards
- [ ] **1.9** Same run with `--proxies`
- ▶ **1.10** **You:** open the replay on a failed or wrong run and debug from it
- [ ] **1.11** Fill in the Playwright column in `COMPARISON.md`

## Phase 2: Stagehand

Learning: lines of code, accuracy, what caching does to speed and cost, when Fetch is enough.

- [ ] **2.1** Check the current Stagehand v4 docs; implement `extract()` with the schema in `impl/stagehand/`
- [ ] **2.2** Run across all competitors; spot-check accuracy against the pages
- [ ] **2.3** Gateway default model vs. a pinned model: accuracy and tokens
- [ ] **2.4** Turn caching on and run three times: tokens and seconds per run
- [ ] **2.5** Try Fetch on the marketing pages: which ones don't need a browser?
- [ ] **2.6** See how each approach handles the missing pricing data
- [ ] **2.7** Log friction entries; fill in the Stagehand column

## Phase 3: logging in and staying logged in

Learning: persistence, and what this would feel like across hundreds of vendor portals.

- [ ] **3.1** **You:** provide the Lucca web app URL and a test account (kept out of code and logs)
- [ ] **3.2** Log in once and save a Context
- [ ] **3.3** Reuse the Context in new sessions
- [ ] **3.4** Test what happens when the login session expires
- [ ] **3.5** Log friction entries

## Phase 4: dashboard Agent

Learning: the no-code experience, trust in the output, how run limits and pricing feel. The Developer plan includes 15 Agent calls a month.

- [ ] **4.1** **You:** create an Agent in the dashboard with a system prompt and the schema
- [ ] **4.2** Trigger it through the API against the 3 competitors (`impl/agent/`)
- [ ] **4.3** Click Optimize, run again, compare
- [ ] **4.4** Director vs. Agents vs. Stagehand: one product or three?
- [ ] **4.5** Log friction entries; fill in the Agent column

## Synthesis (Wed Sep 30)

- [ ] **5.1** Sort the friction log by job and count entries per job
- [ ] **5.2** Check your hypotheses (unmet needs: Governance, Access, Cost predictability, Evals; well served: infrastructure, debugging, model choice)
- [ ] **5.3** Draft 5 observations in Paul's style: a plain claim backed by a specific detail

## Stretch (a week later)

- [ ] **6.1** Re-run all three implementations; record what broke and what healed itself
