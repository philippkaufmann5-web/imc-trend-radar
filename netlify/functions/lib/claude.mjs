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
  let t = String(text || "").trim().replace(/```json/gi, "").replace(/```/g, "");
  const a = t.indexOf("["), b = t.lastIndexOf("]");
  const o = t.indexOf("{"), p = t.lastIndexOf("}");
  let start, end;
  if (o !== -1 && (a === -1 || o < a)) { start = o; end = p; } else { start = a; end = b; }
  if (start === -1 || end === -1) throw new Error("Kein JSON in der Antwort: " + t.slice(0, 140));
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch (e) {
    throw new Error("JSON ungültig: " + String(e).slice(0, 80) + " | Start: " + t.slice(start, start + 100));
  }
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
