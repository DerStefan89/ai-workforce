# Messung „vorher-basis60“ (scripts/messe-chat.mjs)

Erzeugt von `scripts/messe-chat.mjs` am 2026-10-11T00:44:13.193Z. Rohdaten: `messung-vorher-basis60.json`.

## Umgebung

- Modus: nur Leerlauf 120 min, Startseite `#/dashboard`, Seitenwechsel alle 60 s, danach Turns: 0 (jarvis)
- Startvorlage: Standard (ohne LEITSTAND_STARTVORLAGE_PFAD)
- Leitstand: `Leitstand läuft auf http://127.0.0.1:4199 (Startvorlage: startvorlagen/beispielprojekt.json, Projekte: ai-workforce, haushaltsbuch, haushaltsbuch2)`
- Warnung beim Start: `[F-391] Startvorlage 'startvorlagen/beispielprojekt.json' geladen — Codex ist nicht verfügbar (Startvorlage trägt keinen vollständigen 'worker.codex'-Block (startziel/versionDeklariert/sandbox)); der Router fällt auf den fehleranfälligen claude-code-Klassifikationspfad zurück (F-337/F-373). Fix: LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`
- Git: 9bdfc1a, Node v24.16.0, win32 x64, Arbeitsordner `C:\Users\stefa\Projekte\ai-workforce`
- Start 2026-10-10T22:43:49.301Z, Ende 2026-10-11T00:44:13.193Z
- Modern Standby während der Messung: Standby beginnt 23:47:31 UTC
- Energiemodus (Netzbetrieb / Akku): nicht erhoben

**Zuschnitt:** ausgewertet bis 2026-10-10T23:47:00.000Z (Vorher-Basis (Challenger 11.10.2026): die sauberen ersten 60 min vor dem Standby um 23:47:31 UTC); Quelle `messung-vorher.json`. Werte danach sind nicht enthalten.

## Kennzahlen (ms)

| Kennzahl | Median | Max | Anzahl |
|---|---|---|---|
| K1 Absenden → 202 (Client) | – | – | 0 |
| K2 request_eingang → prozess_gestartet (Server) | – | – | 0 |
| Prozess (prozess_gestartet → prozess_beendet) | – | – | 0 |
| Nachbereitung (prozess_beendet → letzte Marke) | – | – | 0 |
| 202 → Poll-Ergebnis (Client) | – | – | 0 |
| Poll-Ergebnis → Anzeige (Client) | – | – | 0 |
| K3 Absenden → Antwort sichtbar | – | – | 0 |
| GET /api/zustand (alle 2 s) | 51 | 2402 | 1813 (p95 125) |
| Event-Loop max je 60-s-Fenster | 98 | 2162 | 63 |

## Seitenwechsel — Zeit bis „Inhalt sichtbar“ (ms, Ziel P3 ≤ 500)

Kriterium (in der Seite, nach jedem Animation-Frame ab dem Setzen von `location.hash`): Hauptseiten — der Container `[data-view]` ist sichtbar, trägt ≥ 40 Zeichen Text, und keine Textzeile ist ein Ladehinweis (die deutschen `*.laedt`-Texte, z. B. „Lädt…“); `#/chat` — die Gesprächsfläche ist sichtbar und zeigt einen Verlaufseintrag oder den Leerzustand. Frist 10 s.

| Seite | Median | Max | Wechsel | nicht erreicht |
|---|---|---|---|---|
| `#/dashboard` | 249 | 327 | 10 | 0 |
| `#/roadmap` | 119 | 3654 | 11 | 0 |
| `#/workboard` | 171 | 1156 | 11 | 0 |
| `#/attention` | 132 | 1131 | 10 | 0 |
| `#/capabilities` | 72 | 151 | 10 | 0 |
| `#/chat` | 24 | 67 | 10 | 0 |

## GET /api/zustand frisch und spät (ms, Ziel P1 p95 ≤ 300)

| Abschnitt | Median | p95 | Max | Anzahl |
|---|---|---|---|---|
| frisch (erste 10 min) | 58 | 504 | 2402 | 275 |
| spät (letzte 10 min des Leerlaufs) | 56 | 92 | 125 | 290 |

## Zeiten je Poll-Quelle (Server, je 60-s-Fenster, ms)

| Quelle | max | größtes p95 | Median der p95 | Aufrufe |
|---|---|---|---|---|
| laeufe | 1254 | 1101 | 71 | 3696 |
| startfehler | 0 | 0 | 0 | 3696 |
| workflows | 299 | 107 | 6 | 3696 |
| gesamt | 1378 | 1246 | 79 | 3696 |
| workitems | 445 | 445 | 37 | 54 |

## Synchrone Strecken > 200 ms (Server): 202

| Zeit (UTC) | Strecke | ms |
|---|---|---|
| 22:45:08 | `GET /api/zustand` | 1380 |
| 22:45:09 | `GET /api/zustand` | 1291 |
| 22:45:12 | `GET /api/zustand` | 1246 |
| 22:43:53 | `GET /api/zustand` | 1239 |
| 22:45:03 | `GET /api/zustand` | 1214 |
| 22:45:02 | `GET /api/zustand` | 1212 |
| 22:45:06 | `GET /api/zustand` | 1201 |
| 22:45:01 | `GET /api/zustand` | 1194 |
| 22:45:04 | `GET /api/zustand` | 1139 |
| 22:45:10 | `GET /api/zustand` | 871 |
| 22:45:06 | `GET /api/workitems` | 579 |
| 22:47:10 | `GET /api/auftraege` | 562 |
| 22:45:13 | `GET /api/zustand` | 543 |
| 22:43:54 | `GET /api/auftraege` | 518 |
| 22:46:09 | `GET /api/auftraege` | 513 |
| 22:44:02 | `GET /api/zustand` | 462 |
| 22:44:50 | `GET /api/zustand` | 462 |
| 22:44:54 | `GET /api/zustand` | 453 |
| 22:45:17 | `GET /api/zustand` | 446 |
| 22:44:58 | `GET /api/zustand` | 441 |
| 22:44:57 | `GET /api/zustand` | 431 |
| 22:44:48 | `GET /api/zustand` | 423 |
| 22:44:40 | `GET /api/zustand` | 409 |
| 22:43:54 | `GET /api/workflows/router-376b6439-fb2d-4c92-b7c4-f36b7d53c009` | 406 |
| 22:46:23 | `GET /api/zustand` | 404 |

## Event-Loop (Ziel P2 max ≤ 200 ms je 60-s-Fenster): 12 von 63 Fenstern über 200 ms

- 22:44:50 UTC: max 1358 ms, p99 350 ms
- 22:45:50 UTC: max 2162 ms, p99 328 ms
- 22:46:50 UTC: max 904 ms, p99 311 ms
- 22:47:50 UTC: max 736 ms, p99 308 ms
- 22:50:50 UTC: max 244 ms, p99 44 ms
- 22:56:50 UTC: max 226 ms, p99 43 ms
- 23:08:50 UTC: max 201 ms, p99 40 ms
- 23:20:50 UTC: max 279 ms, p99 56 ms
- 23:26:50 UTC: max 288 ms, p99 48 ms
- 23:32:50 UTC: max 287 ms, p99 55 ms
- 23:38:50 UTC: max 275 ms, p99 43 ms
- 23:44:50 UTC: max 280 ms, p99 57 ms

## Seitenmetriken (DevTools-Protokoll, je Minute)

| Zeit (UTC) | JS-Heap MB | JS-Heap gesamt MB | DOM-Knoten | Listener | Dokumente | Layout-Objekte |
|---|---|---|---|---|---|---|
| 22:43:55 | 9 | 16 | 12509 | 166 | 1 | 1067 |
| 22:44:55 | 12 | 15 | 12029 | 166 | 1 | 683 |
| 22:45:55 | 14 | 17 | 15128 | 166 | 1 | 2712 |
| 22:46:55 | 17 | 24 | 14505 | 166 | 1 | 1257 |
| 22:47:55 | 12 | 21 | 13932 | 166 | 1 | 784 |
| 22:48:55 | 12 | 15 | 14952 | 166 | 1 | 540 |
| 22:49:55 | 14 | 16 | 14941 | 166 | 1 | 1011 |
| 22:50:55 | 14 | 17 | 14936 | 166 | 1 | 683 |
| 22:51:55 | 13 | 15 | 14930 | 166 | 1 | 998 |
| 22:52:55 | 11 | 17 | 14926 | 166 | 1 | 738 |
| 22:53:55 | 15 | 17 | 14946 | 166 | 1 | 784 |
| 22:54:55 | 16 | 17 | 16035 | 166 | 1 | 1183 |
| 22:55:55 | 16 | 18 | 14941 | 166 | 1 | 1011 |
| 22:56:55 | 16 | 19 | 15373 | 166 | 1 | 851 |
| 22:57:55 | 16 | 18 | 16458 | 166 | 1 | 1862 |
| 22:58:55 | 16 | 18 | 15634 | 166 | 1 | 1259 |
| 22:59:55 | 16 | 18 | 14945 | 166 | 1 | 784 |
| 23:00:55 | 16 | 19 | 14979 | 166 | 1 | 540 |
| 23:01:55 | 14 | 16 | 14936 | 166 | 1 | 1011 |
| 23:02:55 | 13 | 18 | 14933 | 166 | 1 | 683 |
| 23:03:55 | 16 | 21 | 16899 | 166 | 1 | 1589 |
| 23:04:55 | 16 | 20 | 15633 | 166 | 1 | 1257 |
| 23:05:55 | 16 | 20 | 14943 | 166 | 1 | 784 |
| 23:06:55 | 11 | 19 | 16034 | 166 | 1 | 1183 |
| 23:07:55 | 14 | 19 | 14938 | 166 | 1 | 1011 |
| 23:08:55 | 13 | 18 | 14934 | 166 | 1 | 683 |
| 23:09:55 | 12 | 15 | 14926 | 166 | 1 | 998 |
| 23:10:55 | 11 | 20 | 15633 | 166 | 1 | 1257 |
| 23:11:55 | 16 | 18 | 14946 | 166 | 1 | 784 |
| 23:12:55 | 16 | 19 | 16037 | 166 | 1 | 1183 |
| 23:13:55 | 16 | 18 | 14942 | 166 | 1 | 1011 |
| 23:14:56 | 16 | 18 | 15374 | 166 | 1 | 1019 |
| 23:15:56 | 13 | 18 | 14926 | 166 | 1 | 998 |
| 23:16:56 | 17 | 21 | 15632 | 166 | 1 | 1257 |
| 23:17:56 | 15 | 17 | 14945 | 166 | 1 | 784 |
| 23:18:56 | 12 | 16 | 14957 | 166 | 1 | 540 |
| 23:19:56 | 16 | 19 | 14942 | 166 | 1 | 1011 |
| 23:20:56 | 14 | 18 | 14929 | 166 | 1 | 683 |
| 23:21:56 | 16 | 20 | 16938 | 166 | 1 | 2010 |
| 23:22:56 | 16 | 21 | 14946 | 166 | 1 | 738 |
| 23:23:56 | 16 | 18 | 14943 | 166 | 1 | 784 |
| 23:24:56 | 15 | 19 | 14978 | 166 | 1 | 540 |
| 23:25:56 | 13 | 18 | 14928 | 166 | 1 | 1011 |
| 23:26:56 | 13 | 18 | 14934 | 166 | 1 | 683 |
| 23:27:56 | 17 | 23 | 16937 | 166 | 1 | 2010 |
| 23:28:56 | 15 | 20 | 15630 | 166 | 1 | 1188 |
| 23:29:56 | 15 | 17 | 14943 | 166 | 1 | 784 |
| 23:30:56 | 16 | 19 | 14981 | 166 | 1 | 544 |
| 23:31:56 | 16 | 20 | 16006 | 166 | 1 | 2010 |
| 23:32:56 | 13 | 17 | 14932 | 166 | 1 | 683 |
| 23:33:56 | 17 | 21 | 16937 | 166 | 1 | 2010 |
| 23:34:56 | 16 | 20 | 14945 | 166 | 1 | 738 |
| 23:35:56 | 15 | 17 | 14942 | 166 | 1 | 784 |
| 23:36:56 | 17 | 19 | 16032 | 166 | 1 | 1183 |
| 23:37:56 | 15 | 18 | 14935 | 166 | 1 | 1011 |
| 23:38:56 | 13 | 19 | 14932 | 166 | 1 | 683 |
| 23:39:56 | 16 | 22 | 16936 | 166 | 1 | 2010 |
| 23:40:56 | 15 | 19 | 14938 | 166 | 1 | 738 |
| 23:41:56 | 14 | 17 | 14941 | 166 | 1 | 784 |
| 23:42:56 | 16 | 19 | 16032 | 166 | 1 | 1183 |
| 23:43:56 | 15 | 18 | 14937 | 166 | 1 | 1011 |
| 23:44:56 | 13 | 17 | 14933 | 166 | 1 | 683 |
| 23:45:56 | 12 | 15 | 14928 | 166 | 1 | 998 |
| 23:46:56 | 14 | 17 | 14937 | 166 | 1 | 738 |

## Heap-Snapshots (nach erzwungener Speicherbereinigung)

nicht erhoben

## Speicherverlauf (je Minute)

F-1015 über Mediane (Minute 15–20 gegen die letzten 5 min): Chromium 648 → 608 MB (0.94), JS-Heap 16 → 14 MB (0.88), DOM-Knoten 14945 → 14937 (1), Listener 166 → 166 (1) — erfüllt.

F-1015 Einzelproben (Ende ≤ 1,2 × Wert nach 15 min): Chromium 648 → 608 MB (Faktor 0.94), JS-Heap 16 → 14 MB (0.88), DOM-Knoten 14945 → 14937 (1), Listener 166 → 166 (1) — erfüllt.

Max RSS Server 151 MB, max RSS Chromium 706 MB, min. freier Speicher 4156 MB; Wachstum ab der ersten Probe nach dem Laden bis Ende Warmlauf/Leerlauf: Server 27 %, Chromium 69 % (Faktor 1.69, Ziel F-1015 ≤ 1,2).

| Zeit (UTC) | Server RSS MB | Chromium RSS MB | frei MB | claude.exe |
|---|---|---|---|---|
| 22:43:50 | 82 | 99 | 6202 | 10 |
| 22:44:00 | 116 | 360 | 5897 | 10 |
| 22:44:51 | 90 | 534 | 5809 | 10 |
| 22:45:51 | 86 | 527 | 5722 | 10 |
| 22:46:51 | 98 | 541 | 5743 | 10 |
| 22:47:51 | 98 | 429 | 5302 | 10 |
| 22:48:51 | 99 | 421 | 5325 | 10 |
| 22:49:51 | 99 | 516 | 5059 | 10 |
| 22:50:51 | 108 | 482 | 5199 | 10 |
| 22:51:51 | 110 | 455 | 5289 | 10 |
| 22:52:51 | 110 | 587 | 5280 | 10 |
| 22:53:51 | 113 | 598 | 4717 | 10 |
| 22:54:51 | 113 | 621 | 4294 | 10 |
| 22:55:51 | 113 | 580 | 4315 | 10 |
| 22:56:51 | 132 | 634 | 4318 | 10 |
| 22:57:51 | 135 | 643 | 4308 | 10 |
| 22:58:51 | 137 | 655 | 4350 | 10 |
| 22:59:51 | 137 | 648 | 4312 | 10 |
| 23:00:51 | 138 | 672 | 4156 | 10 |
| 23:01:51 | 137 | 601 | 5295 | 10 |
| 23:02:51 | 143 | 588 | 5327 | 10 |
| 23:03:51 | 146 | 691 | 5207 | 10 |
| 23:04:51 | 146 | 689 | 5190 | 10 |
| 23:05:51 | 146 | 655 | 5189 | 10 |
| 23:06:51 | 147 | 682 | 5093 | 10 |
| 23:07:51 | 146 | 613 | 5394 | 10 |
| 23:08:51 | 148 | 585 | 5398 | 10 |
| 23:09:51 | 147 | 651 | 5314 | 10 |
| 23:10:51 | 147 | 685 | 5269 | 10 |
| 23:11:51 | 148 | 676 | 5243 | 10 |
| 23:12:51 | 146 | 706 | 5260 | 10 |
| 23:13:51 | 148 | 649 | 5254 | 10 |
| 23:14:51 | 146 | 686 | 5278 | 10 |
| 23:15:51 | 148 | 681 | 5244 | 10 |
| 23:16:51 | 148 | 682 | 5240 | 10 |
| 23:17:51 | 148 | 674 | 5264 | 10 |
| 23:18:51 | 147 | 696 | 5244 | 10 |
| 23:19:51 | 146 | 652 | 5241 | 10 |
| 23:20:51 | 149 | 557 | 5280 | 10 |
| 23:21:51 | 149 | 683 | 5177 | 10 |
| 23:22:51 | 148 | 675 | 5395 | 10 |
| 23:23:51 | 148 | 653 | 5381 | 10 |
| 23:24:51 | 150 | 676 | 5314 | 10 |
| 23:25:51 | 149 | 551 | 5459 | 10 |
| 23:26:51 | 150 | 591 | 5389 | 10 |
| 23:27:51 | 149 | 677 | 5291 | 10 |
| 23:28:51 | 149 | 674 | 5291 | 10 |
| 23:29:51 | 151 | 658 | 5276 | 10 |
| 23:30:51 | 150 | 672 | 5256 | 10 |
| 23:31:51 | 149 | 673 | 5183 | 10 |
| 23:32:51 | 150 | 584 | 5338 | 10 |
| 23:33:51 | 149 | 678 | 5237 | 10 |
| 23:34:51 | 150 | 676 | 5228 | 10 |
| 23:35:51 | 150 | 652 | 5233 | 10 |
| 23:36:51 | 150 | 675 | 5209 | 10 |
| 23:37:51 | 150 | 599 | 5439 | 10 |
| 23:38:51 | 150 | 581 | 5383 | 10 |
| 23:39:51 | 150 | 672 | 5322 | 10 |
| 23:40:51 | 150 | 616 | 5363 | 10 |
| 23:41:51 | 150 | 641 | 5291 | 10 |
| 23:42:51 | 151 | 674 | 5269 | 10 |
| 23:43:51 | 145 | 615 | 5309 | 10 |
| 23:44:51 | 145 | 596 | 5307 | 10 |
| 23:45:51 | 145 | 546 | 5257 | 10 |
| 23:46:51 | 147 | 608 | 5265 | 10 |
