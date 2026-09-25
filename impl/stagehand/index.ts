import type { Implementation } from "../../lib/types.js";

// Phase 2: Stagehand extract() with the shared schema across every competitor.
// Built after Phase 1 so the contrast is felt, not just described.
const stagehand: Implementation = {
  name: "stagehand",
  async extract() {
    throw new Error("Stagehand implementation comes in Phase 2");
  },
};

export default stagehand;
