// Persistence (Netlify Blobs), settings, subscriptions and optional email.
import { getStore } from "@netlify/blobs";

const STORE = "imc-research-hub";
const s = () => getStore(STORE);

export async function getJSON(key) {
  try { return (await s().get(key, { type: "json" })) || null; } catch { return null; }
}
export async function setJSON(key, value) { await s().setJSON(key, value); }

// ---- Jobs (for syllabus / bpm async results) ----
export async function setJob(id, data) { await setJSON(`jobs:${id}`, data); }
export async function getJob(id) { return getJSON(`jobs:${id}`); }

// ---- Settings (model + cost table) ----
const DEFAULT_SETTINGS = {
  model: "claude-sonnet-4-6",
  autoMarket: "off", // "off" | "weekly" | "monthly"
  // Richtwerte in USD pro 1 Mio Token (anpassbar in den Einstellungen).
  prices: {
    "claude-opus-4-8": { in: 15, out: 75 },
    "claude-sonnet-4-6": { in: 3, out: 15 },
    "claude-haiku-4-5-20251001": { in: 1, out: 5 },
  },
  webSearchPer1000: 10, // USD pro 1000 Suchanfragen (Richtwert)
};
export async function getSettings() {
  return { ...DEFAULT_SETTINGS, ...((await getJSON("settings")) || {}) };
}
export async function saveSettings(patch) {
  const next = { ...(await getSettings()), ...patch };
  await setJSON("settings", next);
  return next;
}
export async function getActiveModel() {
  return (await getSettings()).model || process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
}

// ---- Subscriptions (Suchabos) ----
export async function getSubscribers() { return (await getJSON("subscribers")) || []; }
export async function addSubscriber(sub) {
  const list = await getSubscribers();
  const next = list.filter((x) => x.email !== sub.email);
  next.push({ ...sub, id: cryptoId(), subscribedAt: new Date().toISOString() });
  await setJSON("subscribers", next);
  return next;
}
export async function deleteSubscriber(id) {
  const list = await getSubscribers();
  const next = list.filter((x) => x.id !== id);
  await setJSON("subscribers", next);
  return next;
}
export function maskEmail(email) {
  const [user, domain] = String(email).split("@");
  if (!domain) return email;
  const shown = user.slice(0, 3);
  return `${shown}${"*".repeat(Math.max(3, user.length - 3))}@${domain}`;
}
function cryptoId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

// ---- Email (optional, via Resend) ----
export async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY, from = process.env.FROM_EMAIL;
  if (!key || !from) { console.log(`[email skipped] ${to} · ${subject}`); return false; }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  return r.ok;
}
