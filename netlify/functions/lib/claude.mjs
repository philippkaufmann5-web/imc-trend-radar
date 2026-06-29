// Claude Messages API wrapper. The API key lives only here (Netlify env var).
import { getActiveModel } from "./store.mjs";

const API_URL = "https://api.anthropic.com/v1/messages";

// content: array of content blocks OR a string. options: { web, maxTokens, system, model }
export async function callClaude(content, options = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY ist nicht gesetzt.");
  const model = options.model || (await getActiveModel());

  const body = {
    model,
    max_tokens: options.maxTokens || 4000,
    messages: Array.isArray(options.messages)
      ? options.messages
      : [{ role: "user", content }],
  };
  if (typeof options.temperature === "number") body.temperature = options.temperature;
  if (options.system) body.system = options.system;
  if (options.web) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: options.web }];

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return { text, raw: data };
}

// Helper: extract a JSON value (object or array) from a model reply.
export function extractJSON(text) {
  let t = String(text || "").replace(/```json/gi, "").replace(/```/g, "");
  const i = t.search(/[\[{]/);
  if (i === -1) throw new Error("Kein JSON in der Antwort: " + t.slice(0, 140));
  // Walk to the matching closing bracket, respecting strings/escapes.
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let j = i; j < t.length; j++) {
    const ch = t[j];
    if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') { inStr = true; continue; }
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") { depth--; if (depth === 0) { end = j; break; } }
  }
  const slice = end !== -1 ? t.slice(i, end + 1) : t.slice(i);
  const tryParse = (s) => { try { return JSON.parse(s); } catch { return null; } };
  let v = tryParse(slice);
  if (v !== null) return v;
  v = tryParse(slice.replace(/,\s*([}\]])/g, "$1")); // remove trailing commas
  if (v !== null) return v;
  throw new Error("JSON ungültig: " + slice.slice(0, 120));
}

// Build a document content block from an uploaded file (base64).
export function docBlock(file) {
  if (!file) return null;
  if (file.mediaType === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.dataB64 } };
  }
  // plain text fallback
  return { type: "text", text: `--- Dokument: ${file.filename || "Datei"} ---\n${file.text || ""}` };
}
