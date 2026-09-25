import type { Implementation } from "../../lib/types.js";

// Phase 4: a dashboard-built Browserbase Agent, triggered through the API
// (bb.agents.runs.create with the agent's id and the schema as resultSchema).
const agent: Implementation = {
  name: "agent",
  async extract() {
    throw new Error("Agent implementation comes in Phase 4");
  },
};

export default agent;
