// Scheduled (@daily): startet die Market-Research-Analyse automatisch,
// wenn in den Einstellungen "alle 7 Tage" oder "alle 30 Tage" gewählt ist
// und der letzte Lauf entsprechend lange her ist.

import { getSettings, getJSON } from "./lib/store.mjs";

export const config = { schedule: "@daily" };

const DAYS = { weekly: 7, monthly: 30 };

export default async (req) => {
  const s = await getSettings();
  const mode = s.autoMarket || "off";
  if (!DAYS[mode]) return new Response("auto off", { status: 200 });

  const market = await getJSON("market:latest");
  const last = market && market.generatedAt ? new Date(market.generatedAt).getTime() : 0;
  if (Date.now() - last < DAYS[mode] * 86400000) return new Response("not due", { status: 200 });

  const origin = new URL(req.url).origin;
  await fetch(`${origin}/api/analyze-market`, { method: "POST" });
  return new Response("triggered", { status: 200 });
};
