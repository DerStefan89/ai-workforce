# Chat-Messung „langlauf“ (F45 B0)

Erzeugt von `scripts/messe-chat.mjs` am 2026-10-10T19:06:48.792Z. Rohdaten: `messung-langlauf.json`.

## Umgebung

- Modus: jarvis, Turns: 5, Warmlauf: 30 min
- Startvorlage: Standard (ohne LEITSTAND_STARTVORLAGE_PFAD)
- Leitstand: `Leitstand läuft auf http://127.0.0.1:4199 (Startvorlage: startvorlagen/beispielprojekt.json, Projekte: ai-workforce, haushaltsbuch, haushaltsbuch2)`
- Warnung beim Start: `[F-391] Startvorlage 'startvorlagen/beispielprojekt.json' geladen — Codex ist nicht verfügbar (Startvorlage trägt keinen vollständigen 'worker.codex'-Block (startziel/versionDeklariert/sandbox)); der Router fällt auf den fehleranfälligen claude-code-Klassifikationspfad zurück (F-337/F-373). Fix: LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`
- Git: d10f9be, Node v24.16.0, win32 x64, Arbeitsordner `C:\Users\stefa\Projekte\ai-workforce`
- Start 2026-10-10T18:35:58.919Z, Ende 2026-10-10T19:06:48.792Z
- Modern Standby während der Messung: keiner

## Kennzahlen (ms)

| Kennzahl | Median | Max | Anzahl |
|---|---|---|---|
| K1 Absenden → 202 (Client) | 115 | 279 | 5 |
| K2 request_eingang → prozess_gestartet (Server) | 556 | 714 | 5 |
| Prozess (prozess_gestartet → prozess_beendet) | 5109 | 5542 | 5 |
| Nachbereitung (prozess_beendet → letzte Marke) | 29 | 127 | 5 |
| 202 → Poll-Ergebnis (Client) | 5970 | 6191 | 5 |
| Poll-Ergebnis → Anzeige (Client) | 42 | 126 | 5 |
| K3 Absenden → Antwort sichtbar | 6051 | 6379 | 5 |
| GET /api/zustand (alle 2 s) | 106 | 1301 | 839 (p95 440) |
| Event-Loop max je 60-s-Fenster | 375 | 2118 | 30 |

K4: 5 von 5 Turns enden sichtbar (Antwort 5, Fehler mit Grund 0, hängt 0).

K3 nimmt die Client-Zeile (gesamt_ms), sonst die von außen gemessene Zeit bis zum Ende der Tipp-Punkte. K1 ebenso (absenden_bis_quittung_ms, sonst Klick → 202).

## Speicherverlauf (je Minute)

Max RSS Server 114 MB, max RSS Chromium 707 MB, min. freier Speicher 2280 MB; Wachstum im Warmlauf: Server 38 %, Chromium 500 %.

| Zeit (UTC) | Server RSS MB | Chromium RSS MB | frei MB | claude.exe |
|---|---|---|---|---|
| 18:35:59 | 82 | 98 | 3088 | 10 |
| 18:37:00 | 88 | 396 | 2998 | 10 |
| 18:38:00 | 97 | 401 | 2930 | 10 |
| 18:39:00 | 97 | 398 | 2884 | 10 |
| 18:40:00 | 96 | 393 | 2949 | 10 |
| 18:41:00 | 97 | 381 | 5740 | 10 |
| 18:42:00 | 97 | 363 | 5705 | 10 |
| 18:43:00 | 96 | 591 | 5369 | 10 |
| 18:44:00 | 109 | 573 | 4869 | 10 |
| 18:45:00 | 112 | 560 | 2280 | 10 |
| 18:46:00 | 112 | 552 | 6009 | 10 |
| 18:47:00 | 112 | 537 | 6029 | 10 |
| 18:48:00 | 113 | 524 | 5969 | 10 |
| 18:49:00 | 113 | 518 | 5813 | 10 |
| 18:50:00 | 112 | 520 | 5989 | 10 |
| 18:51:00 | 111 | 513 | 5992 | 10 |
| 18:52:00 | 114 | 508 | 5972 | 10 |
| 18:53:00 | 113 | 506 | 5959 | 10 |
| 18:54:00 | 114 | 494 | 5993 | 10 |
| 18:55:00 | 113 | 499 | 5945 | 10 |
| 18:56:00 | 113 | 489 | 5309 | 10 |
| 18:57:00 | 113 | 707 | 5150 | 10 |
| 18:58:00 | 112 | 704 | 5450 | 10 |
| 18:59:00 | 111 | 703 | 5326 | 10 |
| 19:00:00 | 113 | 681 | 5547 | 10 |
| 19:01:00 | 113 | 664 | 5644 | 10 |
| 19:02:00 | 113 | 649 | 5721 | 10 |
| 19:03:00 | 112 | 634 | 5698 | 10 |
| 19:04:00 | 114 | 619 | 5831 | 10 |
| 19:05:01 | 113 | 603 | 5823 | 10 |
| 19:06:01 | 113 | 588 | 5821 | 10 |

## Turns

| # | Start | Endart | K1 | K2 | Prozess | Nachber. | K3 | Worker | Modell | claude/codex | laufId | Grund / Auszug |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 19:06:03 | Antwort | 39 | 714 | 5109 | 19 | 6051 | claude-code | claude-sonnet-5 | 10/0 | `3cdc66ba7810` | Jarvis OK |
| 2 | 19:06:12 | Antwort | 279 | 556 | 4604 | 127 | 5674 | claude-code | claude-sonnet-5 | 10/0 | `d8c85c6c4ee7` | Jarvis Dieses Projekt heißt AI Workforce. |
| 3 | 19:06:20 | Antwort | 155 | 582 | 5542 | 9 | 6379 | claude-code | claude-sonnet-5 | 10/0 | `fffbb1b8a282` | Jarvis Der aktuelle Meilenstein ist M5 ("Projektkontext, Coach, Challenge-Flow, Architektur, Dogfooding"), aktuell mit F |
| 4 | 19:06:29 | Antwort | 87 | 532 | 5124 | 41 | 5982 | claude-code | claude-sonnet-5 | 10/0 | `51a507c05fd7` | Jarvis F45 ist das Fixpaket "Arbeitsfähigkeit", aktuell in Arbeit mit Teilschritt B0 (Chat); es ist in der Roadmap nach  |
| 5 | 19:06:38 | Antwort | 115 | 530 | 5036 | 29 | 6167 | claude-code | claude-sonnet-5 | 10/0 | `b1dc878a02b6` | Jarvis 42 |
