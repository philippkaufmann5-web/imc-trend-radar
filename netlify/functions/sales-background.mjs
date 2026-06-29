// POST /api/sales (background) – Body: { id, mode, course, linkedin, syllabusText?, file?, messages? }
// Schreibt jobs:<id> = { status:"ready", result: <reply> }. Frontend pollt /api/job?id=.
import { callClaude, docBlock } from "./lib/claude.mjs";
import { setJob } from "./lib/store.mjs";


export default async (req) => {
  let b; try { b = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  const id = b.id;
  if (!id) return new Response("id fehlt", { status: 400 });
  await setJob(id, { status: "running" });

  try {
    const ctx = [
      b.course ? `Weiterbildung: ${b.course}` : "",
      b.syllabusText ? `\n--- Syllabus (Auszug) ---\n${String(b.syllabusText).slice(0, 6000)}` : "",
      b.linkedin ? `\n--- Informationen zur Person ---\n${String(b.linkedin).slice(0, 6000)}` : "",
    ].filter(Boolean).join("\n");

    let system, messages;
    if (b.mode === "roleplay") {
      system = `Du spielst eine fiktive Interessent:in, die sich für die Weiterbildung «${b.course || "des IMC"}» der Universität St.Gallen interessiert, und führst mit der Studienberatung ein realistisches Informationsgespräch. Bleibe in der Rolle der Interessent:in (stelle konkrete Fragen zum Kurs, äussere Bedenken, reagiere auf Argumente) auf Basis dieses Kontexts. Antworte auf Deutsch, natürlich und nicht zu lang (2-4 Sätze).\n\nKONTEXT:\n${ctx}`;
      messages = (b.messages || []).slice(-12);
      if (!messages.length) messages = [{ role: "user", content: "Starte das Gespräch als interessierte Person mit einer ersten Frage." }];
    } else {
      system = `Du unterstützt die Studienberatung des IMC der Universität St.Gallen bei der Vorbereitung eines Informationsgesprächs. Analysiere die Informationen zur Person und den Kurs/Syllabus. Nenne konkret: (1) welche Punkte der Weiterbildung für genau diese Person besonders relevant sind und warum, (2) auf welche Aspekte im Gespräch eingegangen werden sollte und weshalb, (3) mögliche Einwände und gute Antworten. Strukturiert, prägnant, auf Deutsch.\n\nKONTEXT:\n${ctx}`;
      messages = (b.messages && b.messages.length) ? b.messages.slice(-12) : [{ role: "user", content: "Erstelle die Gesprächsvorbereitung." }];
    }

    if (b.file) {
      const idx = messages.findIndex((m) => m.role === "user");
      const doc = docBlock(b.file);
      if (doc) {
        if (idx >= 0) {
          const orig = messages[idx].content;
          messages[idx] = { role: "user", content: [doc, { type: "text", text: typeof orig === "string" ? orig : "Syllabus siehe Dokument." }] };
        } else {
          messages.unshift({ role: "user", content: [doc, { type: "text", text: "Syllabus siehe Dokument." }] });
        }
      }
    }

    const { text } = await callClaude(null, { system, messages, maxTokens: b.mode === "roleplay" ? 700 : 1600 });
    await setJob(id, { status: "ready", result: text });
  } catch (e) {
    await setJob(id, { status: "error", error: String(e).slice(0, 200) });
  }
  return new Response("done", { status: 202 });
};
