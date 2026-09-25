import { z } from "zod/v4";

// The one extraction target every implementation aims at. Keep it identical
// across Playwright, Stagehand and the Agent so results are comparable.
export const Competitor = z.object({
  name: z.string(),
  pricing: z.array(z.object({ plan: z.string(), price: z.string(), period: z.string() })),
  freeTier: z.boolean(),
  keyFeatures: z.array(z.string()).max(8),
  privacyClaims: z.array(z.string()), // relevant to Lucca's positioning
  appStoreRating: z.number().optional(),
  reviewCount: z.number().optional(),
});

export type Competitor = z.infer<typeof Competitor>;
