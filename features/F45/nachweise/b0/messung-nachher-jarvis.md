# Chat-Messung „nachher-jarvis“ (F45 B0)

Erzeugt von `scripts/messe-chat.mjs` am 2026-10-10T18:29:55.488Z. Rohdaten: `messung-nachher-jarvis.json`.

## Umgebung

- Modus: jarvis, Turns: 10, Warmlauf: 0 min
- Startvorlage: Standard (ohne LEITSTAND_STARTVORLAGE_PFAD)
- Leitstand: `Leitstand läuft auf http://127.0.0.1:4199 (Startvorlage: startvorlagen/beispielprojekt.json, Projekte: ai-workforce, haushaltsbuch, haushaltsbuch2)`
- Warnung beim Start: `[F-391] Startvorlage 'startvorlagen/beispielprojekt.json' geladen — Codex ist nicht verfügbar (Startvorlage trägt keinen vollständigen 'worker.codex'-Block (startziel/versionDeklariert/sandbox)); der Router fällt auf den fehleranfälligen claude-code-Klassifikationspfad zurück (F-337/F-373). Fix: LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`
- Git: d10f9be, Node v24.16.0, win32 x64, Arbeitsordner `C:\Users\stefa\Projekte\ai-workforce`
- Start 2026-10-10T18:28:35.993Z, Ende 2026-10-10T18:29:55.488Z
- Modern Standby während der Messung: nicht lesbar

## Kennzahlen (ms)

| Kennzahl | Median | Max | Anzahl |
|---|---|---|---|
| K1 Absenden → 202 (Client) | 28 | 39 | 10 |
| K2 request_eingang → prozess_gestartet (Server) | 251 | 382 | 10 |
| Prozess (prozess_gestartet → prozess_beendet) | 4605 | 5092 | 10 |
| Nachbereitung (prozess_beendet → letzte Marke) | 15 | 36 | 10 |
| 202 → Poll-Ergebnis (Client) | 5141 | 5648 | 10 |
| Poll-Ergebnis → Anzeige (Client) | 27 | 35 | 10 |
| K3 Absenden → Antwort sichtbar | 5191 | 5705 | 10 |
| GET /api/zustand (alle 2 s) | 48 | 1619 | 36 (p95 369) |
| Event-Loop max je 60-s-Fenster | 467 | 467 | 1 |

K4: 10 von 10 Turns enden sichtbar (Antwort 10, Fehler mit Grund 0, hängt 0).

K3 nimmt die Client-Zeile (gesamt_ms), sonst die von außen gemessene Zeit bis zum Ende der Tipp-Punkte. K1 ebenso (absenden_bis_quittung_ms, sonst Klick → 202).

## Turns

| # | Start | Endart | K1 | K2 | Prozess | Nachber. | K3 | Worker | Modell | claude/codex | laufId | Grund / Auszug |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 18:28:39 | Antwort | 23 | 250 | 5092 | 16 | 5705 | claude-code | claude-sonnet-5 | 10/0 | `c5404555dfd6` | Jarvis OK |
| 2 | 18:28:47 | Antwort | 29 | 257 | 4132 | 12 | 4681 | claude-code | claude-sonnet-5 | 10/0 | `8d9934f45c1f` | Jarvis Dieses Projekt heißt AI Workforce. |
| 3 | 18:28:54 | Antwort | 31 | 279 | 4263 | 13 | 4693 | claude-code | claude-sonnet-5 | 10/0 | `45e64c7d607d` | Jarvis Der aktuelle Meilenstein ist M5: Projektkontext, Coach, Challenge-Flow, Architektur und Dogfooding. |
| 4 | 18:29:01 | Antwort | 28 | 287 | 4853 | 17 | 5189 | claude-code | claude-sonnet-5 | 10/0 | `3f8fc909daea` | Jarvis F45 ist das Fixpaket „Arbeitsfähigkeit“, das aktuell mit B0 zur Verbesserung der Zuverlässigkeit des Jarvis-Chats |
| 5 | 18:29:09 | Antwort | 35 | 230 | 4678 | 36 | 5192 | claude-code | claude-sonnet-5 | 10/0 | `b772911a7002` | Jarvis 42 |
| 6 | 18:29:17 | Antwort | 18 | 228 | 4724 | 26 | 5198 | claude-code | claude-sonnet-5 | 10/0 | `fbace9d70676` | Jarvis F-501 · TECH_DEBT · Jarvis-Chat-Turn kostet ~7-10s CLI-Prozessstart je Nachricht. |
| 7 | 18:29:25 | Antwort | 39 | 382 | 4215 | 8 | 4712 | claude-code | claude-sonnet-5 | 10/0 | `092ec0064d55` | Jarvis Nein |
| 8 | 18:29:32 | Antwort | 28 | 252 | 4751 | 11 | 5201 | claude-code | claude-sonnet-5 | 10/0 | `ecbda6e1a611` | Jarvis TypeScript |
| 9 | 18:29:39 | Antwort | 28 | 248 | 4323 | 12 | 4678 | claude-code | claude-sonnet-5 | 10/0 | `b90deda8d5e1` | Jarvis KI-Positionen führen Vorhaben von Idee bis abgenommenem Ergebnis, für einen Nutzer. |
| 10 | 18:29:47 | Antwort | 23 | 244 | 4531 | 18 | 5234 | claude-code | claude-sonnet-5 | 10/0 | `09316efb00b8` | Jarvis Fertig |
