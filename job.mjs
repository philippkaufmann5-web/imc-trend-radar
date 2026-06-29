// POST /api/syllabus (background) – Body: { id, ours:{name,text}, competitors:[{name,text}] }
// PDF-Text wird im Browser extrahiert und hier als Text übergeben.
import { callClaude, extractJSON } from "./lib/claude.mjs";
import { setJob } from "./lib/store.mjs";

export const config = { path: "/api/syllabus" };

export default async (req) => {
  let b; try { b = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  const id = b.id;
  if (!id) return new Response("id fehlt", { status: 400 });
  await setJob(id, { status: "running" });

  try {
    const comp = (b.competitors || [])
      .map((c, i) => `=== MITBEWERBER ${i + 1}: ${c.name || ""} ===\n${String(c.text || "").slice(0, 12000)}`)
      .join("\n\n");

    const content =
`Du bist Curriculum-Expertin am IMC der Universität St.Gallen. Vergleiche unseren Syllabus mit den Syllabi der Mitbewerber. Liefere eine sehr spezifische, gut begründete Analyse: Wo sind wir stark, wo schwach, wo bestehen inhaltliche Gaps? Beziehe dich konkret auf Module/Themen.

Antworte AUSSCHLIESSLICH mit JSON:
{"summary":"2-3 Sätze Gesamtbild",
 "strengths":[{"point":"","detail":"warum, mit Bezug auf Module"}],
 "weaknesses":[{"point":"","detail":""}],
 "gaps":[{"point":"","detail":"was fehlt vs. Mitbewerber"}],
 "recommendations":[{"point":"","detail":""}]}

=== UNSER SYLLABUS (IMC-HSG) ===
${String(b.ours?.text || "").slice(0, 15000)}

${comp}`;

    const { text } = await callClaude(content, { maxTokens: 4000, temperature: 0 });
    const result = extractJSON(text);
    await setJob(id, { status: "ready", finishedAt: new Date().toISOString(), result });
  } catch (e) {
    await setJob(id, { status: "error", error: String(e).slice(0, 200) });
  }
  return new Response("done", { status: 202 });
};
