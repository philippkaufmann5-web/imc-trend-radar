// GET /api/job?id=... → result of an async job (syllabus / bpm).
import { getJob } from "./lib/store.mjs";
export const config = { path: "/api/job" };
export default async (req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id fehlt" }, { status: 400 });
  const data = await getJob(id);
  return Response.json(data || { status: "empty" }, { status: 200 });
};
