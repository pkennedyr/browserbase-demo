# Comparison: one workflow, three ways

Filled in from `results/*.json` and the friction log as each phase finishes.

| | Playwright (Phase 1) | Stagehand (Phase 2) | Agent (Phase 4) |
|---|---|---|---|
| Time to first successful run | | | |
| Lines of code or config | | | |
| Success rate across sites | | | |
| Accuracy (spot-checked against the real page) | | | |
| Seconds per site | | | |
| Cost per run (browser minutes + tokens + calls) | | | |
| Behavior on the second run (cache or Optimize) | | | |
| How we debugged a failure | | | |
| What broke on the re-run a week later | | | |

## Side experiments

| Question | Answer |
|---|---|
| Which sites block us with proxies off? With them on? | |
| Which marketing pages does Fetch handle without a browser? | |
| Gateway default model vs. a pinned model: accuracy and tokens | |
| Cache threshold 2, three runs: tokens and seconds per run | |
| Is Verified available on the Developer plan? (`npm run probe:verified`) | |
| Could we predict the bill before running? | |
| How did we know the extracted data was right? | |
