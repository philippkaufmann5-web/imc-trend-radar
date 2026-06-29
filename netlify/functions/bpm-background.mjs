// POST /api/bpm (background) – Body: { id, text, filename? }
// Der PDF-Text wird im Browser extrahiert und hier als Text übergeben (kein grosser Datei-Body).
// Zwei-Schritt: 1) Web-Recherche (Freitext), 2) JSON strukturieren.
import { callClaude, extractJSON } from "./lib/claude.mjs";
import { setJob } from "./lib/store.mjs";

export const config = { path: "/api/bpm" };

export default async (req) => {
  let b; try { b = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  const id = b.id;
  if (!id) return new Response("id fehlt", { status: 400 });
  await setJob(id, { status: "running" });

  try {
    const flyer = String(b.text || "").slice(0, 12000);
    const research =
`Du suchst Referent:innen für die "Best Practice in Marketing"-Veranstaltung des IMC der Universität St.Gallen. Hier die Themen/Inhalte aus dem hochgeladenen Programm (PDF "${b.filename || "Flyer"}"):

${flyer}

Suche nun im Web nach passenden Personen AUS DEM DACH-RAUM (DE/AT/CH), die bereits zu ähnlichen Themen referiert haben – an Konferenzen, in Podcasts, Blogposts oder dokumentierten Praxis-Use-Cases. Bevorzuge Praktiker:innen.
Liste 6-10 Personen als Stichpunkte. Pro Person: Name, Funktion/Unternehmen, Land, eine klare Begründung WARUM sie zum Thema passt, und mindestens eine prüfbare Quelle mit URL. Keine erfundenen Personen oder Links.`;
    const { text: found } = await callClaude(research, { web: 5, maxTokens: 3500, temperature: 0.2 });

    const structurePrompt =
`Wandle die folgenden Rechercheergebnisse in GENAU dieses JSON um. Gib NUR das JSON-Array aus – nichts davor/danach, kein Markdown, gültiges JSON:
[{"name":"","role":"Funktion/Unternehmen","country":"DE|AT|CH","why":"Begründung, warum diese Person zum Veranstaltungsthema passt","evidence":[{"type":"Konferenz|Podcast|Blog|Use Case","title":"","url":"https://..."}]}]
Jede Person braucht eine klare "why"-Begründung und mindestens eine "evidence" mit echter URL. Personen ohne Quelle weglassen.

RECHERCHE:
${found}`;
    const { text: json } = await callClaude(structurePrompt, { maxTokens: 3500, temperature: 0 });
    const result = extractJSON(json);
    await setJob(id, { status: "ready", finishedAt: new Date().toISOString(), result });
  } catch (e) {
    await setJob(id, { status: "error", error: String(e).slice(0, 200) });
  }
  return new Response("done", { status: 202 });
};
