import Browserbase from "@browserbasehq/sdk";
import type { RunOptions, SessionCost } from "./types.js";

export function apiKey(): string {
  const key = process.env.BROWSERBASE_API_KEY;
  if (!key) throw new Error("BROWSERBASE_API_KEY is not set (see .env.example)");
  return key;
}

export const bb = () => new Browserbase({ apiKey: apiKey() });

export const replayUrl = (id: string) => `https://www.browserbase.com/sessions/${id}`;

// Session settings shared by every implementation that launches a browser.
// projectId is optional in the current API: the key identifies the project.
export function sessionParams(opts: RunOptions, siteId: string) {
  return {
    projectId: process.env.BROWSERBASE_PROJECT_ID || undefined,
    proxies: opts.proxies,
    browserSettings: {
      solveCaptchas: opts.solveCaptchas,
      ...(opts.verified ? { verified: true } : {}),
    },
    userMetadata: { app: "lucca-radar", site: siteId },
  };
}

// Look up what a session actually cost after it has ended.
export async function sessionCost(id: string): Promise<SessionCost> {
  const cost: SessionCost = { id, replayUrl: replayUrl(id) };
  try {
    const s = await bb().sessions.retrieve(id);
    cost.status = s.status;
    cost.proxyBytes = s.proxyBytes;
    if (s.startedAt && s.endedAt) {
      cost.browserSeconds = Math.round((Date.parse(s.endedAt) - Date.parse(s.startedAt)) / 1000);
    }
  } catch (err) {
    cost.status = `lookup failed: ${(err as Error).message}`;
  }
  return cost;
}
