// GET/POST /api/settings → model + price table.
import { getSettings, saveSettings } from "./lib/store.mjs";
export const config = { path: "/api/settings" };
const MODELS = ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"];
export default async (req) => {
  if (req.method === "GET") return Response.json(await getSettings(), { status: 200 });
  if (req.method === "POST") {
    let b; try { b = await req.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
    const patch = {};
    if (b.model && MODELS.includes(b.model)) patch.model = b.model;
    if (b.prices && typeof b.prices === "object") patch.prices = b.prices;
    if (typeof b.webSearchPer1000 === "number") patch.webSearchPer1000 = b.webSearchPer1000;
    if (["off", "weekly", "monthly"].includes(b.autoMarket)) patch.autoMarket = b.autoMarket;
    return Response.json(await saveSettings(patch), { status: 200 });
  }
  return Response.json({ error: "method" }, { status: 405 });
};
