# Messung „nachher-jarvis“ (scripts/messe-chat.mjs)

Erzeugt von `scripts/messe-chat.mjs` am 2026-10-11T10:19:33.298Z. Rohdaten: `messung-nachher-jarvis.json`.

## Umgebung

- Modus: jarvis, Turns: 5, Warmlauf: 0 min
- Startvorlage: Standard (ohne LEITSTAND_STARTVORLAGE_PFAD)
- Leitstand: `Leitstand läuft auf http://127.0.0.1:4199 (Startvorlage: startvorlagen/beispielprojekt.json, Projekte: ai-workforce, haushaltsbuch, haushaltsbuch2)`
- Warnung beim Start: `[F-391] Startvorlage 'startvorlagen/beispielprojekt.json' geladen — Codex ist nicht verfügbar (Startvorlage trägt keinen vollständigen 'worker.codex'-Block (startziel/versionDeklariert/sandbox)); der Router fällt auf den fehleranfälligen claude-code-Klassifikationspfad zurück (F-337/F-373). Fix: LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`
- Git: 9bdfc1a, Node v24.16.0, win32 x64, Arbeitsordner `C:\Users\stefa\Projekte\ai-workforce`
- Start 2026-10-11T10:18:52.026Z, Ende 2026-10-11T10:19:33.298Z
- Modern Standby während der Messung: keiner
- Energiemodus (Netzbetrieb / Akku): Beste Energieeffizienz / Ausgeglichen

## Kennzahlen (ms)

| Kennzahl | Median | Max | Anzahl |
|---|---|---|---|
| K1 Absenden → 202 (Client) | 27 | 37 | 5 |
| K2 request_eingang → prozess_gestartet (Server) | 320 | 442 | 5 |
| Prozess (prozess_gestartet → prozess_beendet) | 4458 | 5348 | 5 |
| Nachbereitung (prozess_beendet → letzte Marke) | 12 | 14 | 5 |
| 202 → Poll-Ergebnis (Client) | 5143 | 5682 | 5 |
| Poll-Ergebnis → Anzeige (Client) | 25 | 38 | 5 |
| K3 Absenden → Antwort sichtbar | 5189 | 5734 | 5 |
| GET /api/zustand (alle 2 s) | 45 | 1369 | 18 (p95 1369) |
| Event-Loop max je 60-s-Fenster | – | – | 0 |

K4: 5 von 5 Turns enden sichtbar (Antwort 5, Fehler mit Grund 0, hängt 0).

K3 nimmt die Client-Zeile (gesamt_ms), sonst die von außen gemessene Zeit bis zum Ende der Tipp-Punkte. K1 ebenso (absenden_bis_quittung_ms, sonst Klick → 202).

## Speicherverlauf (je Minute)

F-1015 (Ende ≤ 1,2 × Wert nach 15 min): nicht bestimmbar (Leerlauf kürzer als 15 min oder keine Proben).

Max RSS Server 82 MB, max RSS Chromium 98 MB, min. freier Speicher 4886 MB; Wachstum ab der ersten Probe nach dem Laden bis Ende Warmlauf/Leerlauf: Server – %, Chromium – % (Faktor –, Ziel F-1015 ≤ 1,2).

| Zeit (UTC) | Server RSS MB | Chromium RSS MB | frei MB | claude.exe |
|---|---|---|---|---|
| 10:18:52 | 82 | 98 | 4886 | 10 |

## Turns

| # | Start | Endart | K1 | K2 | Prozess | Nachber. | K3 | Worker | Modell | claude/codex | laufId | Grund / Auszug |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 10:18:55 | Antwort | 22 | 442 | 4458 | 14 | 5229 | claude-code | claude-sonnet-5 | 10/0 | `0099b55479f7` | Jarvis OK |
| 2 | 10:19:03 | Antwort | 37 | 320 | 3881 | 14 | 4688 | claude-code | claude-sonnet-5 | 10/0 | `a4db7d5aec1d` | Jarvis Dieses Projekt heißt AI Workforce. |
| 3 | 10:19:10 | Antwort | 20 | 268 | 4794 | 12 | 5189 | claude-code | claude-sonnet-5 | 10/0 | `28c9c65a7cc3` | Jarvis Der aktuelle Meilenstein ist M5 ("Projektkontext, Coach, Challenge-Flow, Architektur, Dogfooding"), aktuell mit F |
| 4 | 10:19:18 | Antwort | 35 | 333 | 5348 | 12 | 5734 | claude-code | claude-sonnet-5 | 10/0 | `7a964c91daaf` | Jarvis F45 ist das Fixpaket "Arbeitsfähigkeit", aktuell in Arbeit; Teilschritt B0 (Chat) ist gemergt, Workstream P (Perf |
| 5 | 10:19:26 | Antwort | 27 | 300 | 3855 | 11 | 4703 | claude-code | claude-sonnet-5 | 10/0 | `0cbd34176fd3` | Jarvis 42 |
