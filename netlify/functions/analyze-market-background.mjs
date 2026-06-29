// POST /api/analyze-market (background). Zwei-Schritt pro Cluster/Cross:
// 1) Recherche MIT Websuche (Freitext), 2) Strukturierung OHNE Websuche (JSON).
// Speichert market:latest; verschickt Suchabo-Mails nur für NEUE News (Delta).

import { callClaude, extractJSON } from "./lib/claude.mjs";
import { CLUSTERS } from "./lib/clusters.mjs";
import { setJSON, getJSON, getSubscribers, sendEmail } from "./lib/store.mjs";

export const config = { path: "/api/analyze-market" };
const today = () => new Date().toISOString().slice(0, 10);

function researchCluster(c) {
  return `Heutiges Datum: ${today()}. Recherchiere im Web für das Institut für Marketing und Customer Insight (IMC) der Universität St.Gallen im Bereich "${c.label}" (${c.domain}).
1) MITBEWERBER-NEWS im DACH-Raum (${c.competitorsHint}), maximal 21 Tage alt: neue Weiterbildungs-Angebote, Programme oder relevante Veranstaltungen. Je Fund: Titel, Datum, Anbieter, 1 Satz, Quellen-URL. Wenn nichts <21 Tage: "KEINE NEWS".
2) PESTEL (Aktualität max. 12 Monate) mit Bezug zur Weiterbildung. Pro Kategorie (Politisch, Ökonomisch, Sozial, Technologisch, Ökologisch, Rechtlich) 1-2 Punkte mit Quellen-URL.
Notiere zu JEDEM Punkt sehr kurz, wie relevant er für unser Institut/unsere Weiterbildungen ist (hoch oder mittel) und warum. Antworte als Stichpunkte (mit Datum + URL).`;
}
const researchCross = `Heutiges Datum: ${today()}. Recherchiere im Web für das IMC der Universität St.Gallen Entwicklungen, die ALLE Weiterbildungsbereiche (Marketing, Sales, Kommunikation, Einkauf) ZUGLEICH betreffen – z. B. neue Institute an Schweizer Hochschulen, Akkreditierungs-/Förderregeln, übergreifende Trends der Executive Education (Online-Buchung, KI-Tutoren, Preise, Demografie). NUR was wirklich ALLE betrifft; Bereichsspezifisches weglassen.
Liefere drei Blöcke als Stichpunkte (mit Datum + URL): (A) NEWS (max. 21 Tage), (B) TRENDS (max. 12 Monate), (C) PESTEL (max. 12 Monate, mit Kategorie). Notiere je Punkt kurz Relevanz (hoch/mittel) und warum.`;

function structureCluster(research) {
  return `Wandle die Rechercheergebnisse in GENAU dieses JSON um. Gib NUR das JSON-Objekt aus – kein Markdown, keine Auslassungen, gültiges JSON mit escapten Anführungszeichen:
{"news":[{"title":"","date":"YYYY-MM-DD","relevance":"Hoch","summary":"","impact":"","competitor":"","source":{"title":"","url":""}}],"pestel":{"Politisch":[{"point":"","relevance":"Mittel","impact":"","source":{"title":"","url":""}}],"Ökonomisch":[],"Sozial":[],"Technologisch":[],"Ökologisch":[],"Rechtlich":[]}}
Regeln: max. 3 News; je PESTEL-Kategorie max. 2 Punkte. "relevance" ist NUR "Hoch" oder "Mittel" (wenn nicht hoch, dann "Mittel"); Relevanz = wie wichtig für unser Institut/unsere Weiterbildungen. "impact" = max. 1 kurzer Satz, WARUM relevant. Nur Einträge mit echter URL; keine News -> "news":[].

RECHERCHE:
${research}`;
}
function structureCross(research) {
  return `Wandle die Rechercheergebnisse in GENAU dieses JSON um. Gib NUR das JSON-Objekt aus – kein Markdown, gültiges JSON:
{"news":[{"title":"","date":"YYYY-MM-DD","relevance":"Hoch","summary":"","impact":"","source":{"title":"","url":""}}],"trends":[{"point":"","date":"YYYY-MM-DD","relevance":"Mittel","impact":"","source":{"title":"","url":""}}],"pestel":[{"category":"Politisch","point":"","date":"YYYY-MM-DD","relevance":"Mittel","impact":"","source":{"title":"","url":""}}]}
Regeln: je Block max. 4 Einträge; "relevance" NUR "Hoch" oder "Mittel"; "impact" = max. 1 Satz, warum relevant; nur echte URLs.

RECHERCHE:
${research}`;
}

async function twoStep(researchPrompt, structureFn) {
  const { text: research } = await callClaude(researchPrompt, { web: 5, maxTokens: 3000 });
  const { text: json } = await callClaude(structureFn(research), { maxTokens: 3500 });
  return extractJSON(json);
}
async function analyzeCluster(c) {
  try { return await twoStep(researchCluster(c), structureCluster); }
  catch (e) { return { error: String(e).slice(0, 200) }; }
}
async function analyzeCross() {
  try { return await twoStep(researchCross, structureCross); }
  catch (e) { return { error: String(e).slice(0, 200) }; }
}

function newNewsByCluster(payload, prev) {
  const prevTitles = {};
  for (const c of (prev?.clusters || [])) prevTitles[c.id] = new Set((c.news || []).map((n) => n.title));
  const out = [];
  for (const c of payload.clusters) {
    const seen = prevTitles[c.id] || new Set();
    const fresh = (c.news || []).filter((n) => !seen.has(n.title));
    if (fresh.length) out.push({ id: c.id, label: c.label, news: fresh });
  }
  return out;
}

export default async () => {
  try {
    const previous = await getJSON("market:latest"); // letzter abgeschlossener Lauf
    await setJSON("market:latest", { status: "running", startedAt: new Date().toISOString() });

    const results = await Promise.all(CLUSTERS.map((c) => analyzeCluster(c)));
    const cross = await analyzeCross();

    const clusters = CLUSTERS.map((c, i) => ({
      id: c.id, label: c.label,
      news: results[i].news || [],
      pestel: results[i].pestel || {},
      error: results[i].error,
    }));
    const anyError = clusters.some((c) => c.error) || cross.error;
    const payload = {
      status: "ready",
      generatedAt: new Date().toISOString(),
      clusters,
      crossCluster: { news: cross.news || [], trends: cross.trends || [], pestel: cross.pestel || [], error: cross.error },
      note: anyError ? "Mindestens eine Abfrage meldete einen Fehler. Häufigste Ursache: Web Search ist in der Claude Console nicht aktiviert." : null,
    };
    await setJSON("market:latest", payload);
    if (previous && previous.status === "ready") await setJSON("market:prev", previous);

    // Suchabo-Mails nur für NEUE News (Delta vs. letztem fertigen Lauf)
    const prevReady = previous && previous.status === "ready" ? previous : null;
    if (prevReady) {
      const fresh = newNewsByCluster(payload, prevReady);
      if (fresh.length) {
        const subs = await getSubscribers();
        for (const sub of subs) {
          const relevant = fresh.filter((c) => !sub.clusters?.length || sub.clusters.includes(c.id));
          const items = relevant.flatMap((c) => c.news.map((n) => `<li><b>${c.label}:</b> ${n.title}</li>`));
          if (!items.length) continue;
          await sendEmail({
            to: sub.email,
            subject: "IMC Market Research – neue Mitbewerber-News",
            html: `<div style="font-family:Arial"><p>Neue Einträge im IMC Assistant:</p><ul>${items.join("")}</ul><p style="color:#888;font-size:12px">Abo verwaltbar in den Einstellungen.</p></div>`,
          });
        }
      }
    }
    return new Response("ok", { status: 202 });
  } catch (e) {
    await setJSON("market:latest", { status: "error", error: String(e) });
    return new Response(String(e), { status: 500 });
  }
};
