// GET /api/market → cached market analysis (persists until next run).
import { getJSON } from "./lib/store.mjs";
export const config = { path: "/api/market" };
export default async () => {
  const data = await getJSON("market:latest");
  return Response.json(data || { status: "empty" }, { status: 200 });
};
