import { bb } from "./browserbase.js";

// Ground rule: respect robots.txt. A deliberately simple check of the
// `User-agent: *` group's Disallow prefixes. If robots.txt can't be read,
// we treat the URL as allowed and say so. It goes through Browserbase Fetch,
// so this machine never contacts the competitor sites directly.
export async function robotsAllows(url: string): Promise<{ allowed: boolean; note: string }> {
  const { origin, pathname } = new URL(url);
  let text: string;
  try {
    const res = await bb().fetchAPI.create({ url: `${origin}/robots.txt`, format: "raw", allowRedirects: true });
    if (res.statusCode >= 400) return { allowed: true, note: `robots.txt ${res.statusCode}` };
    text = String(res.content);
  } catch (err) {
    return { allowed: true, note: `robots.txt unreadable: ${(err as Error).message}` };
  }

  let inStarGroup = false;
  const disallowed: string[] = [];
  for (const raw of text.split("\n")) {
    const [key, ...rest] = raw.split("#")[0]!.split(":");
    const value = rest.join(":").trim();
    const k = key?.trim().toLowerCase();
    if (k === "user-agent") inStarGroup = value === "*";
    else if (inStarGroup && k === "disallow" && value) disallowed.push(value);
  }
  const hit = disallowed.find((prefix) => pathname.startsWith(prefix));
  return hit ? { allowed: false, note: `disallowed by "${hit}"` } : { allowed: true, note: "allowed" };
}
