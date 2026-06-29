// POST /api/bpm  (background)
// Body: { id, file:{mediaType:"application/pdf",dataB64,filename} }
// Sucht passende Referent:innen (DACH) für die Veranstaltung; jobs:<id>.

import { callClaude, extractJSON, docBlock } from "./lib/claude.mjs";
import { setJob } from "./lib/store.mjs";

export const config = { path: "/api/bpm" };

export default async (req) => {
  let b; try { b = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  const id = b.id;
  if (!id) return new Response("id fehlt", { status: 400 });
  await setJob(id, { status: "running" });

  (async () => {
    try {
      const content = [];
      content.push({ type: "text", text:
`Du suchst Referent:innen für die "Best Practice in Marketing"-Veranstaltung des IMC der Universität St.Gallen. Lies das angehängte PDF (Themen/Programm). Suche dann im Web nach passenden Personen AUS DEM DACH-RAUM (Deutschland, Österreich, Schweiz), die bereits zu ähnlichen Themen referiert haben – an Konferenzen, in Podcasts, Blogposts oder dokumentierten Praxis-Use-Cases. Bevorzuge Praktiker:innen.

Antworte AUSSCHLIESSLICH mit JSON – eine Liste von 6-10 Personen:
[{"name":"","role":"Funktion/Unternehmen","country":"DE|AT|CH","why":"begründung, warum passend zum Thema",
  "evidence":[{"type":"Konferenz|Podcast|Blog|Use Case","title":"","url":"https://..."}]}]
Jede Person braucht mindestens eine prüfbare Quelle mit URL. Keine erfundenen Personen oder Links.` });
      const d = docBlock(b.file); if (d) content.push(d);

      const { text } = await callClaude(content, { web: 8, maxTokens: 4000 });
      const result = extractJSON(text);
      await setJob(id, { status: "ready", finishedAt: new Date().toISOString(), result });
    } catch (e) {
      await setJob(id, { status: "error", error: String(e) });
    }
  })();

  return new Response("accepted", { status: 202 });
};
