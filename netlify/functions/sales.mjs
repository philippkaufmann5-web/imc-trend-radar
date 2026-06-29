// POST /api/sales  (sync)
// Body: { mode:"prep"|"roleplay", course, linkedin, syllabusText?, messages:[{role,content}] }
// Gibt { reply } zurück.

import { callClaude } from "./lib/claude.mjs";

export const config = { path: "/api/sales" };

export default async (req) => {
  let b; try { b = await req.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
  const ctx = [
    b.course ? `Weiterbildung: ${b.course}` : "",
    b.syllabusText ? `\n--- Syllabus (Auszug) ---\n${String(b.syllabusText).slice(0, 6000)}` : "",
    b.linkedin ? `\n--- LinkedIn-Infos der Person ---\n${String(b.linkedin).slice(0, 6000)}` : "",
  ].filter(Boolean).join("\n");

  let system, messages;
  if (b.mode === "roleplay") {
    system = `Du spielst eine fiktive Interessent:in für eine Weiterbildung des IMC der Universität St.Gallen und führst mit der Studienberatung ein realistisches Informationsgespräch. Bleibe in der Rolle der Interessent:in (stelle Fragen, äussere Bedenken, reagiere auf Argumente) auf Basis dieses Kontexts. Antworte auf Deutsch, natürlich und nicht zu lang.\n\nKONTEXT:\n${ctx}`;
    messages = (b.messages || []).slice(-12);
    if (!messages.length) messages = [{ role: "user", content: "Starte das Gespräch als interessierte Person mit einer ersten Frage." }];
  } else {
    system = `Du unterstützt die Studienberatung des IMC der Universität St.Gallen bei der Vorbereitung eines Informationsgesprächs. Analysiere LinkedIn-Infos der Person und den Kurs/Syllabus. Nenne konkret: (1) welche Punkte der Weiterbildung für genau diese Person besonders relevant sind und warum, (2) auf welche Aspekte im Gespräch eingegangen werden sollte und weshalb, (3) mögliche Einwände und gute Antworten. Strukturiert, prägnant, auf Deutsch.\n\nKONTEXT:\n${ctx}`;
    messages = (b.messages && b.messages.length) ? b.messages.slice(-12)
      : [{ role: "user", content: "Erstelle die Gesprächsvorbereitung." }];
  }

  try {
    const { text } = await callClaude(null, { system, messages, maxTokens: 1500 });
    return Response.json({ reply: text }, { status: 200 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
};
