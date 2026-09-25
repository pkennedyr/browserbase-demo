import { readdir, readFile } from "node:fs/promises";
import type { SiteResult } from "./types.js";

// Find the most recent earlier results file for this implementation.
export async function previousRun(dir: string, impl: string, current: string) {
  const files = (await readdir(dir))
    .filter((f) => f.endsWith(`-${impl}.json`) && f !== current)
    .sort();
  const last = files.at(-1);
  if (!last) return undefined;
  return JSON.parse(await readFile(`${dir}/${last}`, "utf8")) as { file?: string; results: SiteResult[] };
}

// Field-level changes per competitor: the "what changed since last run" flag.
export function changes(prev: SiteResult[], next: SiteResult[]) {
  const out: Record<string, string[]> = {};
  for (const n of next) {
    const p = prev.find((r) => r.siteId === n.siteId);
    if (!p?.data || !n.data) continue;
    const fields = new Set([...Object.keys(p.data), ...Object.keys(n.data)]) as Set<keyof typeof n.data>;
    const changed = [...fields].filter((f) => JSON.stringify(p.data![f]) !== JSON.stringify(n.data![f]));
    if (changed.length) out[n.siteId] = changed;
  }
  return out;
}
