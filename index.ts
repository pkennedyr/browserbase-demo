import "dotenv/config";
import { browserbase, Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod/v4";

// A real, publicly scrapable product page (no bot protection, works on the Free plan).
const PRODUCT_URL =
  "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html";

async function main() {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) {
    throw new Error("BROWSERBASE_API_KEY is required");
  }

  // Launch a real Chrome browser in Browserbase's cloud. The API key alone
  // identifies your project; no project id is needed.
  const browser = await browserbase.launch({ apiKey });
  console.log(
    `Session started. Watch live / replay: https://www.browserbase.com/sessions/${browser.sessionId}`
  );

  try {
    // cache: true lets Browserbase reuse results for steps with stable inputs on later runs.
    const stagehand = await Stagehand.create({ browser, cache: true });

    try {
      const [page] = await browser.context.pages();
      if (!page) {
        throw new Error("No page was created for the browser session");
      }

      console.log(`Navigating to ${PRODUCT_URL}`);
      await page.goto(PRODUCT_URL, { waitUntil: "domcontentloaded" });

      console.log("Extracting product details...");
      const product = await stagehand.extract(
        "Extract the product's title, price, star rating, availability, and description.",
        z.object({
          title: z.string(),
          price: z.string(),
          rating: z.string().describe("Star rating as text, e.g. 'Three'"),
          availability: z.string(),
          description: z.string(),
        })
      );
      console.log("Product:\n", product.data);

      console.log("Looking for the 'Add to basket' button...");
      const observed = await stagehand.observe("Find the 'Add to basket' button.");
      console.log("Observe result:\n", observed.data);

      console.log("Extracting the product info table...");
      const info = await stagehand.extract(
        "Extract the product information table (UPC, product type, prices, tax, number of reviews).",
        z.object({
          upc: z.string(),
          productType: z.string(),
          priceExclTax: z.string(),
          priceInclTax: z.string(),
          tax: z.string(),
          numberOfReviews: z.string(),
        })
      );
      console.log("Product info:\n", info.data);
    } finally {
      await stagehand.close();
    }
  } finally {
    await browser.close();
    console.log(
      `Done. Replay: https://www.browserbase.com/sessions/${browser.sessionId}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
