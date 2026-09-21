# browserbase-demo

A first Browserbase project: a [Stagehand](https://docs.stagehand.dev) V4 script that opens a
real Chrome browser in Browserbase's cloud, loads a live product page, and extracts structured
data (title, price, availability, description, and the product info table) with natural-language
`extract` / `observe` calls instead of hand-written selectors.

The target is a public, unprotected storefront (books.toscrape.com), so it runs on the Free plan
with no proxies. LLM calls go through Browserbase's Model Gateway on the same API key.

## Setup

Requires Node.js 22.18 or newer.

```bash
cp .env.example .env   # then paste your BROWSERBASE_API_KEY into .env
npm install
npm start
```

The script prints a `https://www.browserbase.com/sessions/<id>` link when it starts. Open it to
watch the browser live, and afterwards to see the replay, logs, and network activity.

## Notes

- Only `BROWSERBASE_API_KEY` is needed. The key identifies the project, so no project id is set.
- `Stagehand.create({ browser, cache: true })` enables Browserbase's server-side cache, so repeated
  steps with stable inputs are cheaper on later runs.
- The star rating extracts as empty because the site encodes it as a CSS class rather than visible
  text, which the accessibility snapshot does not include. A follow-up could read that class name.
