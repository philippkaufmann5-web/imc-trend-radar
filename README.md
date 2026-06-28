# IMC Trend Radar

Eine Netlify-App, die laufend das Web nach Trends für die berufsbegleitende Weiterbildung des **Instituts für Marketing und Customer Insight (IMC)** der Universität St.Gallen durchsucht – recherchiert über die **Claude API**, im HSG-Design, übersichtlich gruppiert nach Weiterbildungs-Cluster.

## Features

- **Trend-Übersicht**, gruppiert nach vier Clustern (Marketing, Sales & Vertrieb, Kommunikation, Einkauf), damit nicht jedes Einzelprogramm separat recherchiert wird.
- **Use-Case-Filter**: Trend-Scouting, Curriculum-Gap, Wettbewerb, Nachfrage-Signale, Synthese.
- **Detailansicht** pro Trend: Reifegrad, Zeithorizont, Relevanz, betroffene Programme, konkrete Curriculum-Empfehlung und belegte Quellen.
- **E-Mail-Anmeldung** mit Auswahl der Use Cases (und optional einzelner Cluster) – Updates kommen nur zu den angekreuzten Themen.
- **Einstellbare Such-Frequenz** (täglich / wöchentlich / monatlich).
- **Claude-Recherche serverseitig** – der API-Key liegt ausschliesslich in den Netlify-Functions, nie im Browser.

## Cluster

| Cluster | Programme |
|---|---|
| Marketing | DAS Marketing Executive, CAS Marketing Management, Digital Marketing Academy, Intensivseminar Strategisches Marketing Management, Intensivseminar Marketing Intelligence |
| Sales & Vertrieb | DAS Sales Executive, CAS Sales Management, Digitalisierung & Nachhaltigkeit im Vertrieb |
| Kommunikation | CAS Kommunikation und Management |
| Einkauf & Procurement | CAS Strategisches Einkaufsmanagement |

Cluster und Programme werden zentral in `netlify/functions/lib/clusters.mjs` (Backend) und in `assets/app.js` (Frontend-Beispieldaten) gepflegt.

## Architektur

```
Browser (statisches Frontend)
   │  GET /api/trends      → liest gecachte Trends (schnell)
   │  POST /api/refresh     → startet Hintergrund-Recherche
   │  POST /api/subscribe   → speichert E-Mail + Use Cases
   │  GET/POST /api/settings→ liest/setzt die Frequenz
   ▼
Netlify Functions
   ├─ trends.mjs              GET, liest Cache (Netlify Blobs)
   ├─ refresh-background.mjs  Background, ruft Claude (Websuche) pro Cluster
   ├─ subscribe.mjs           speichert Abonnent:innen
   ├─ settings.mjs            globale Frequenz
   └─ scheduled-refresh.mjs   läuft @daily, triggert Refresh wenn fällig
   ▼
Claude API (claude-sonnet-4-6) + web_search   |   Netlify Blobs (Speicher)
```

Die eigentliche Recherche läuft als **Background-Function** (bis 15 Min.), damit die Websuche über alle Cluster nie ins Timeout läuft. Das Frontend liest nur den schnellen Cache und pollt nach einem Refresh.

## Deployment

1. **Repo zu Netlify** verbinden (oder Ordner per Drag & Drop auf app.netlify.com ziehen).
2. **Environment-Variablen** setzen (Site settings → Environment variables), siehe `.env.example`:
   - `ANTHROPIC_API_KEY` – **erforderlich**.
   - `CLAUDE_MODEL` – optional (Default `claude-sonnet-4-6`).
   - `RESEND_API_KEY` + `FROM_EMAIL` – optional, nur für den E-Mail-Versand.
3. In der **Claude Console** muss Web Search für die Organisation aktiviert sein.
4. Deploy. Beim ersten Aufruf zeigt die App Beispieldaten und einen Button **„Jetzt recherchieren“**; danach übernimmt der geplante Lauf.

Lokale Entwicklung: `npm install`, dann `netlify dev`.

## Kosten (Anhaltspunkt)

Pro vollständigem Lauf ein Claude-Aufruf je Cluster (4) mit Websuche. Websuche kostet ca. 10 USD pro 1 000 Suchanfragen plus Token-Kosten. Bei wöchentlichem Rhythmus ist das gering. Die Frequenz steuert direkt die Kosten.

## Hinweis zur Qualität

Quellen werden automatisiert recherchiert und nach Typ gekennzeichnet (Forschung / Report / Anbieter / Medien). Anbieter-Whitepaper sind oft Marketing – bitte vor Verwendung in Programmen prüfen. Die App ist eine Entscheidungs- und Recherchehilfe, kein Ersatz für die fachliche Beurteilung.
