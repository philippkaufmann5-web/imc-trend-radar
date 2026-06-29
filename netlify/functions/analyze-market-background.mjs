// POST /api/analyze-market  (background, up to 15 min)
// Recherchiert pro Cluster aktuelle Mitbewerber-News (max. 21 Tage) und eine
// PESTEL-Analyse (Aktualität < 12 Monate) inkl. Trends, plus clusterübergreifende
// Punkte. Ergebnis wird unter market:latest gespeichert (bleibt bis zur nächsten
// Analyse bestehen) und Suchabo-Empfänger werden benachrichtigt.

import { callClaude, extractJSON } from "./lib/claude.mjs";
import { CLUSTERS } from "./lib/clusters.mjs";
import { setJSON, getJSON, getSubscribers, sendEmail } from "./lib/store.mjs";

export const config = { path: "/api/analyze-market" };

const today = () => new Date().toISOString().slice(0, 10);

function clusterPrompt(c) {
  return `Heutiges Datum: ${today()}. Du recherchierst für das Institut für Marketing und Customer Insight (IMC) der Universität St.Gallen im Bereich "${c.label}" (${c.domain}).

Suche im Web nach:
1) NEUIGKEITEN (max. 21 Tage alt): neue Weiterbildungs-Angebote, Programme oder relevante Veranstaltungen von MITBEWERBERN im DACH-Raum (${c.competitorsHint}). Nur Einträge mit erkennbarem Datum innerhalb der letzten 21 Tage.
2) PESTEL-Analyse (Quellen/Entwicklungen aus den letzten 12 Monaten) mit Bezug zur Weiterbildung in diesem Bereich, inkl. relevanter TRENDS (z. B. Online-Buchung von Weiterbildungen, KI, Förderlandschaft).

Antworte AUSSCHLIESSLICH mit gültigem JSON (kein Markdown, KEINE Auslassungen wie "..."). Struktur:
{
 "news": [ {"title":"Titel","date":"YYYY-MM-DD","summary":"1-2 Sätze","impact":"max. 1 Satz: wie beeinflusst das unsere Weiterbildung?","competitor":"Anbieter","source":{"title":"Quelle","url":"https://..."}} ],
 "pestel": {
   "Politisch": [ {"point":"Aussage","impact":"max. 1 Satz","source":{"title":"Quelle","url":"https://..."}} ],
   "Ökonomisch": [],
   "Sozial": [],
   "Technologisch": [],
   "Ökologisch": [],
   "Rechtlich": []
 }
}
Fülle JEDE PESTEL-Kategorie mit 1-3 echten Punkten in genau dieser Objektstruktur. Verwende niemals "..." im Output. Jeder Punkt braucht eine echte Quelle mit URL. Wenn es keine echten News der letzten 21 Tage gibt: "news": [].`;
}

const crossPrompt = `Heutiges Datum: ${today()}. Für das IMC der Universität St.Gallen: Suche im Web nach Entwicklungen, die ALLE Weiterbildungsbereiche (Marketing, Sales, Kommunikation, Einkauf) ZUGLEICH betreffen – z. B. eine Schweizer Hochschule gründet ein neues Institut, neue Akkreditierungs-/Förderregeln, übergreifende Markttrends in der Executive Education (Online-Buchung von Weiterbildungen, KI-Tutoren, Preise, demografische Entwicklung).
WICHTIG: Nimm NUR Einträge auf, die wirklich ALLE Bereiche betreffen. Wenn ein Punkt klar zu EINEM Bereich gehört (z. B. "Nachfrage nach KI-Skills besonders im Marketing"), gehört er NICHT hierher – lass ihn weg.
Antworte AUSSCHLIESSLICH mit JSON:
{"news":[{"title":"","date":"YYYY-MM-DD","summary":"","impact":"kurz (max. 1 Satz): Auswirkung auf unsere Weiterbildungen","source":{"title":"","url":""}}],
 "trends":[{"point":"","date":"YYYY-MM-DD","impact":"kurz (max. 1 Satz)","source":{"title":"","url":""}}],
 "pestel":[{"category":"Politisch|Ökonomisch|Sozial|Technologisch|Ökologisch|Rechtlich","point":"","date":"YYYY-MM-DD","impact":"kurz (max. 1 Satz)","source":{"title":"","url":""}}]}
Nur echte, prüfbare Quellen mit URL und Datum (News max. 21 Tage; Trends/PESTEL Aktualität max. 12 Monate).`;

async function safeJSON(promptText) {
  try {
    const { text } = await callClaude(promptText, { web: 5, maxTokens: 5000 });
    return extractJSON(text);
  } catch (e) { return { error: String(e).slice(0, 200) }; }
}

function countNews(payload) {
  let n = (payload.crossCluster?.news?.length) || 0;
  for (const c of payload.clusters) n += (c.news?.length || 0);
  return n;
}

export default async () => {
  try {
    await setJSON("market:latest", { status: "running", startedAt: new Date().toISOString() });
    const prev = await getJSON("market:prev");

    const results = await Promise.all(CLUSTERS.map((c) => safeJSON(clusterPrompt(c))));
    const cross = await safeJSON(crossPrompt);

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
    if (await getJSON("market:latest")) await setJSON("market:prev", payload);
    await setJSON("market:latest", payload);

    // Notify Suchabo subscribers if there is anything new vs. previous run.
    const newCount = countNews(payload);
    if (newCount && prev) {
      const subs = await getSubscribers();
      for (const sub of subs) {
        const clusters2 = payload.clusters.filter((c) => !sub.clusters?.length || sub.clusters.includes(c.id));
        const items = clusters2.flatMap((c) => (c.news || []).map((n) => `<li><b>${c.label}:</b> ${n.title}</li>`));
        if (!items.length) continue;
        await sendEmail({
          to: sub.email,
          subject: "IMC Market Research – neue Mitbewerber-News",
          html: `<div style="font-family:Arial"><p>Neue Einträge im IMC Research Hub:</p><ul>${items.join("")}</ul></div>`,
        });
      }
    }
    return new Response("ok", { status: 202 });
  } catch (e) {
    await setJSON("market:latest", { status: "error", error: String(e) });
    return new Response(String(e), { status: 500 });
  }
};
