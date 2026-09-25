import "dotenv/config";
import { bb, replayUrl } from "../lib/browserbase.js";

// Can a self-serve (Developer plan) account start a Verified browser at all?
// Whatever comes back, success or an error, is the finding.
try {
  const session = await bb().sessions.create({ browserSettings: { verified: true } });
  console.log(`Verified session created: ${replayUrl(session.id)}`);
  await bb().sessions.update(session.id, { status: "REQUEST_RELEASE" });
  console.log("Released it. Verified mode IS available on this plan.");
} catch (err) {
  console.log("Verified mode refused on this plan:");
  console.log((err as Error).message);
}
