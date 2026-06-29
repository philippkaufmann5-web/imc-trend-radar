// GET /api/subscriptions → list (masked).  POST {action:add|delete}
import { getSubscribers, addSubscriber, deleteSubscriber, maskEmail } from "./lib/store.mjs";
import { CLUSTERS } from "./lib/clusters.mjs";
export const config = { path: "/api/subscriptions" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CIDS = new Set(CLUSTERS.map((c) => c.id));
export default async (req) => {
  if (req.method === "GET") {
    const list = await getSubscribers();
    return Response.json(list.map((s) => ({ id: s.id, email: maskEmail(s.email), clusters: s.clusters || [] })), { status: 200 });
  }
  if (req.method === "POST") {
    let b; try { b = await req.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
    if (b.action === "delete") {
      if (!b.id) return Response.json({ error: "id fehlt" }, { status: 400 });
      const list = await deleteSubscriber(b.id);
      return Response.json({ ok: true, count: list.length }, { status: 200 });
    }
    const email = String(b.email || "").trim().toLowerCase();
    if (!EMAIL.test(email)) return Response.json({ error: "Ungültige E-Mail." }, { status: 400 });
    const clusters = (b.clusters || []).filter((c) => CIDS.has(c));
    await addSubscriber({ email, clusters });
    return Response.json({ ok: true }, { status: 200 });
  }
  return Response.json({ error: "method" }, { status: 405 });
};
