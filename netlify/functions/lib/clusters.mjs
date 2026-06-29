// Die IMC-Weiterbildungen, gebündelt in vier Hauptcluster.
// Quelle: IMC-HSG Weiterbildungsprogramm (Stand 2026/27).

export const CLUSTERS = [
  {
    id: "marketing",
    label: "Marketing & Digital",
    domain:
      "Marketing-Management, digitales Marketing, KI im Marketing, Customer Experience, Brand- und Luxusmanagement, Marketing-Controlling",
    competitorsHint:
      "z. B. ZHAW, HWZ, Hochschule Luzern, Uni Zürich Executive, Frankfurt School, ESMT, IMD, WU Executive Academy",
    programs: [
      "DAS Marketing Executive",
      "CAS Marketing Management",
      "AI-Driven Marketing: Künstliche Intelligenz in Marketing und Sales",
      "Customer Experience Masterclass",
      "Marketing Bootcamp",
      "Intensivseminar Marketing Controlling",
      "Digital Marketing Academy",
      "Luxury Summer School",
    ],
  },
  {
    id: "sales",
    label: "Sales & Vertrieb",
    domain:
      "Vertriebsmanagement, B2B- und B2C-Sales, Key Account Management, Sales Excellence, Verkaufsprozesse",
    competitorsHint:
      "z. B. ZHAW, HWZ, Hochschule Luzern, Mercuri International, ESMT, Ruhr-Uni Bochum Sales",
    programs: [
      "DAS Sales Executive",
      "CAS Sales Management",
      "Intensivseminar Excellence in Key Account Management",
      "Intensivseminar Aktives Verkaufen",
      "Intensivseminar B2B Marketing und Sales",
      "Intensivseminar Sales Process Optimization",
    ],
  },
  {
    id: "kommunikation",
    label: "Kommunikation & Brand",
    domain:
      "Unternehmenskommunikation, PR, Markenführung, Storytelling, digitale Kommunikationsstrategien, Reputations- und Krisenkommunikation",
    competitorsHint:
      "z. B. ZHAW IAM, HWZ, Quadriga Hochschule Berlin, Uni Leipzig Communication Management",
    programs: ["CAS Kommunikation und Management"],
  },
  {
    id: "einkauf",
    label: "Einkauf & Supply Management",
    domain:
      "strategisches Einkaufsmanagement, Procurement, Supply Chain, Lieferantenmanagement, Verhandlung, Beschaffung in volatilen Märkten",
    competitorsHint:
      "z. B. BME Akademie, Hochschule Luzern, ZHAW, Procure.ch, Bundeswehr-Uni, Fraunhofer",
    programs: [
      "CAS Strategisches Einkaufsmanagement",
      "Intensivseminar Beschaffung in einer VUCA-Welt",
      "Intensivseminar Einkauf strategisch ausrichten",
    ],
  },
];

// Flache Kursliste (für Sales Assistant & Syllabus-Auswahl).
export const COURSES = CLUSTERS.flatMap((c) =>
  c.programs.map((p) => ({ name: p, cluster: c.id, clusterLabel: c.label }))
);

export function getCluster(id) {
  return CLUSTERS.find((c) => c.id === id);
}
