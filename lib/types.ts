import type { Competitor } from "../schema.js";

export interface Site {
  id: string;
  name: string;
  siteUrl: string;
  appStoreUrl?: string;
}

export interface RunOptions {
  // Browserbase session toggles, so Phase 1 can compare on/off.
  proxies: boolean;
  solveCaptchas: boolean;
  verified: boolean;
}

// Cost inputs gathered per site. Browser time comes from the Browserbase
// session record after close; tokens come from the model layer when there is one.
export interface Usage {
  sessionIds: string[];
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  llmCalls?: number;
  cacheHits?: number;
  notes?: string[];
}

export interface SiteResult {
  siteId: string;
  ok: boolean;
  data?: Partial<Competitor>;
  error?: string;
  wallMs: number;
  usage: Usage;
  // Filled in by the runner from the Browserbase API once the session ends.
  sessions?: SessionCost[];
}

export interface SessionCost {
  id: string;
  replayUrl: string;
  status?: string;
  browserSeconds?: number;
  proxyBytes?: number;
}

// Every implementation exports one of these. The runner owns timing, error
// handling, cost lookups and writing results; the implementation only extracts.
export interface Implementation {
  name: "playwright" | "stagehand" | "agent";
  extract(site: Site, opts: RunOptions): Promise<{ data: Partial<Competitor>; usage: Usage }>;
}
