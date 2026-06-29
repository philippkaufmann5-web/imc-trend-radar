// POST /api/syllabus  (background)
// Body: { id, course, ours:{mediaType,dataB64|text,filename}, competitors:[...] }
// Schreibt Ergebnis nach jobs:<id>; das Frontend pollt /api/job?id=.

import { callClaude, extractJSON, docBlock } from "./lib/claude.mjs";
import { setJob } from "./lib/store.mjs";

export const config = { path: "/api/syllabus" };

export default async (req) => {
  let b; try { b = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  const id = b.id;
  if (!id) return new Response("id fehlt", { status: 400 });
  await setJob(id, { status: "running" });

  (async () => {
    try {
      const content = [];
      content.push({ type: "text", text:
`Du bist Curriculum-Expertin am IMC der Universität St.Gallen. Vergleiche unseren Syllabus für "${b.course || "die Weiterbildung"}" mit den Syllabi der Mitbewerber. Liefere eine sehr spezifische, gut begründete Analyse: Wo sind wir stark, wo schwach, wo bestehen inhaltliche Gaps? Beziehe dich konkret auf Module/Themen.

Antworte AUSSCHLIESSLICH mit JSON:
{"summary":"2-3 Sätze Gesamtbild",
 "strengths":[{"point":"","detail":"warum, mit Bezug auf Module"}],
 "weaknesses":[{"point":"","detail":""}],
 "gaps":[{"point":"","detail":"was fehlt vs. Mitbewerber"}],
 "recommendations":[{"point":"","detail":""}]}` });

      content.push({ type: "text", text: "=== UNSER SYLLABUS (IMC-HSG) ===" });
      const ours = docBlock(b.ours); if (ours) content.push(ours);

      (b.competitors || []).forEach((comp, i) => {
        content.push({ type: "text", text: `=== MITBEWERBER ${i + 1}: ${comp.name || ""} ===` });
        const d = docBlock(comp); if (d) content.push(d);
      });

      const { text } = await callClaude(content, { maxTokens: 4000 });
      const result = extractJSON(text);
      await setJob(id, { status: "ready", finishedAt: new Date().toISOString(), result });
    } catch (e) {
      await setJob(id, { status: "error", error: String(e) });
    }
  })();

  return new Response("accepted", { status: 202 });
};
