# Chat-Messung „vorher-jarvis“ (F45 B0)

Erzeugt von `scripts/messe-chat.mjs` am 2026-10-10T17:17:53.255Z. Rohdaten: `messung-vorher-jarvis.json`.

## Umgebung

- Modus: jarvis, Turns: 10, Warmlauf: 0 min
- Startvorlage: Standard (ohne LEITSTAND_STARTVORLAGE_PFAD)
- Leitstand: `Leitstand läuft auf http://127.0.0.1:4199 (Startvorlage: startvorlagen/beispielprojekt.json, Projekte: ai-workforce, haushaltsbuch, haushaltsbuch2)`
- Warnung beim Start: `[F-391] Startvorlage 'startvorlagen/beispielprojekt.json' geladen — Codex ist nicht verfügbar (Startvorlage trägt keinen vollständigen 'worker.codex'-Block (startziel/versionDeklariert/sandbox)); der Router fällt auf den fehleranfälligen claude-code-Klassifikationspfad zurück (F-337/F-373). Fix: LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`
- Git: d10f9be, Node v24.16.0, win32 x64, Arbeitsordner `C:\Users\stefa\Projekte\ai-workforce`
- Start 2026-10-10T17:16:20.786Z, Ende 2026-10-10T17:17:53.255Z

## Kennzahlen (ms)

| Kennzahl | Median | Max | Anzahl |
|---|---|---|---|
| K1 Absenden → 202 (Client) | 30 | 37 | 10 |
| K2 request_eingang → prozess_gestartet (Server) | 235 | 284 | 10 |
| Prozess (prozess_gestartet → prozess_beendet) | 4991 | 6112 | 10 |
| Nachbereitung (prozess_beendet → letzte Marke) | 11 | 23 | 10 |
| 202 → Poll-Ergebnis (Client) | 5384 | 6693 | 10 |
| Poll-Ergebnis → Anzeige (Client) | 17 | 39 | 10 |
| K3 Absenden → Antwort sichtbar | 5426 | 6740 | 10 |
| GET /api/zustand (alle 2 s) | 45 | 2948 | 39 (p95 83) |
| Event-Loop max je 60-s-Fenster | 701 | 701 | 1 |

K4: 10 von 10 Turns enden sichtbar (Antwort 10, Fehler mit Grund 0, hängt 0).

K3 nimmt die Client-Zeile (gesamt_ms), sonst die von außen gemessene Zeit bis zum Ende der Tipp-Punkte. K1 ebenso (absenden_bis_quittung_ms, sonst Klick → 202).

## Turns

| # | Start | Endart | K1 | K2 | Prozess | Nachber. | K3 | Worker | Modell | claude/codex | laufId | Grund / Auszug |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 17:16:26 | Antwort | 37 | 284 | 5097 | 19 | 5836 | claude-code | claude-sonnet-5 | 10/0 | `d40ff0737474` | Jarvis OK |
| 2 | 17:16:36 | Antwort | 26 | 265 | 6112 | 23 | 6740 | claude-code | claude-sonnet-5 | 10/0 | `14e3d80b8174` | Jarvis Dieses Projekt heißt AI Workforce — eine lokale Orchestrierungsanwendung, die ein Vorhaben von der Idee bis zum a |
| 3 | 17:16:46 | Antwort | 33 | 242 | 5964 | 8 | 6724 | claude-code | claude-sonnet-5 | 10/0 | `ff6363d089f2` | Jarvis Der aktuelle Meilenstein ist M5 — "Projektkontext, Coach, Challenge-Flow, Architektur, Dogfooding" —, innerhalb d |
| 4 | 17:16:55 | Antwort | 22 | 198 | 5912 | 10 | 6200 | claude-code | claude-sonnet-5 | 10/0 | `2cdfd1ab9a0a` | Jarvis F45 ist das Fixpaket "Arbeitsfähigkeit" innerhalb von M5, aktuell IN_ARBEIT mit dem Baustein B0 Chat (Akte in doc |
| 5 | 17:17:04 | Antwort | 23 | 176 | 4945 | 10 | 5160 | claude-code | claude-sonnet-5 | 10/0 | `fc8c1b1e795c` | Jarvis 42 |
| 6 | 17:17:13 | Antwort | 18 | 228 | 3435 | 11 | 4138 | claude-code | claude-sonnet-5 | 10/0 | `b6836e6d9a76` | Jarvis F-501 |
| 7 | 17:17:20 | Antwort | 35 | 280 | 4241 | 8 | 4701 | claude-code | claude-sonnet-5 | 10/0 | `5ffdf69546b8` | Jarvis Nein |
| 8 | 17:17:27 | Antwort | 22 | 215 | 4327 | 11 | 4660 | claude-code | claude-sonnet-5 | 10/0 | `70ff605aad7b` | Jarvis TypeScript |
| 9 | 17:17:35 | Antwort | 34 | 226 | 5037 | 9 | 5692 | claude-code | claude-sonnet-5 | 10/0 | `12aab81bbcb5` | Jarvis Workforce führt Vorhaben per KI-Positionen von Idee zur Abnahme. |
| 10 | 17:17:44 | Antwort | 35 | 283 | 3929 | 11 | 4684 | claude-code | claude-sonnet-5 | 10/0 | `9c4873197a1e` | Jarvis Fertig |
