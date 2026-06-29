# IMC Research Hub

Multi-Tool-Plattform für das Institut für Marketing und Customer Insight (IMC) der Universität St.Gallen, im HSG-Design. Netlify-App mit serverseitiger Claude-Anbindung (API-Key bleibt in den Netlify-Umgebungsvariablen).

## Tabs

1. **Market Research** – pro Hauptcluster: Mitbewerber-News (max. 21 Tage) und PESTEL-Analyse (< 12 Monate) inkl. Trends, plus clusterübergreifende Punkte. Button „Analyse jetzt starten“, Ergebnisse bleiben gespeichert bis zur nächsten Analyse. Suchabo (E-Mail bei neuen News).
2. **Syllabus Comparison** – eigener + Mitbewerber-Syllabi (PDF) hochladen → Stärken/Schwächen/Gaps, begründet.
3. **Sales Assistant** – LinkedIn-Infos + Kurs → Gesprächsempfehlungen; dazu ein fiktives Übungsgespräch im Chat.
4. **BPM Finder** – Veranstaltungs-PDF hochladen → passende DACH-Referent:innen mit Quellen und Begründung.
5. **MRSG** – Verlinkung zum Gutachter-Matching der Marketing Review St.Gallen.
6. **Einstellungen** – Modellversion für alle Features, dynamische Kosten-Richtwerte, Suchabo-Verwaltung (E-Mails maskiert, löschbar).

## Cluster (aus dem IMC-Programm)

- **Marketing & Digital**: DAS Marketing Executive, CAS Marketing Management, AI-Driven Marketing, Customer Experience Masterclass, Marketing Bootcamp, Marketing Controlling, Digital Marketing Academy, Luxury Summer School
- **Sales & Vertrieb**: DAS Sales Executive, CAS Sales Management, Key Account Management, Aktives Verkaufen, B2B Marketing und Sales, Sales Process Optimization
- **Kommunikation & Brand**: CAS Kommunikation und Management
- **Einkauf & Supply Management**: CAS Strategisches Einkaufsmanagement, Beschaffung in einer VUCA-Welt, Einkauf strategisch ausrichten

Definiert in `netlify/functions/lib/clusters.mjs` (Backend) und `assets/app.js` (UI).

## Endpunkte (Netlify Functions)

| Pfad | Zweck |
|---|---|
| `POST /api/analyze-market` | Hintergrund-Analyse (News+PESTEL+Cross) → `market:latest` |
| `GET /api/market` | gespeicherte Analyse lesen |
| `POST /api/syllabus` | Syllabus-Vergleich (Hintergrund-Job) |
| `POST /api/bpm` | Referentensuche (Hintergrund-Job) |
| `GET /api/job?id=` | Ergebnis eines Jobs |
| `POST /api/sales` | Gesprächsvorbereitung / Rollenspiel (synchron) |
| `GET/POST /api/settings` | Modell + Preis-Richtwerte |
| `GET/POST /api/subscriptions` | Suchabos (anlegen, auflisten, löschen) |

Lange Recherchen (Market, Syllabus, BPM) laufen als **Background Functions** (bis 15 Min.); das Frontend pollt das Ergebnis. Speicher: **Netlify Blobs** (kein Setup nötig).

## Update-Deployment

Die Site ist bereits mit GitHub + Netlify verbunden. Zum Aktualisieren:

1. Den **Inhalt** dieses Projekts in das bestehende GitHub-Repo legen (alte Dateien ersetzen) und committen/pushen — oder über „uploading an existing file“ hochladen.
2. Netlify deployt automatisch.

Benötigte Umgebungsvariable: `ANTHROPIC_API_KEY` (bereits gesetzt). Optional: `CLAUDE_MODEL`, `RESEND_API_KEY` + `FROM_EMAIL` (für Suchabo-Mails). Web Search muss in der Claude Console für die Organisation aktiv sein.

## Hinweise

- Datei-Uploads (PDF) bitte < ~4 MB.
- Quellen werden automatisiert recherchiert und sind verlinkt – vor Verwendung prüfen.
- Modell- und Preisangaben in den Einstellungen sind Richtwerte; aktuelle Preise bei Anthropic prüfen.
