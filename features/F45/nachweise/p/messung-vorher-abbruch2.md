# Messung „vorher“ (scripts/messe-chat.mjs)

Erzeugt von `scripts/messe-chat.mjs` am 2026-10-10T21:09:19.256Z. Rohdaten: `messung-vorher-abbruch2.json`.

**Hinweis (nachgetragen):** Wiederholung mit 60 min, Selbstabbruch nach 20 min bei 1 544 MB frei (Firefox ≈ 5 GB). Die ersten ≈ 2 min (20:49–20:51 UTC) überlappten mit dem Auschecken eines git-Worktrees. Start-Snapshot umbenannt in `heap-vorher-abbruch2-start.heapsnapshot`.

## Umgebung

- Modus: nur Leerlauf 60 min, Startseite `#/dashboard`, Seitenwechsel alle 60 s, danach Turns: 0 (jarvis)
- Startvorlage: Standard (ohne LEITSTAND_STARTVORLAGE_PFAD)
- Leitstand: `Leitstand läuft auf http://127.0.0.1:4199 (Startvorlage: startvorlagen/beispielprojekt.json, Projekte: ai-workforce, haushaltsbuch, haushaltsbuch2)`
- Warnung beim Start: `[F-391] Startvorlage 'startvorlagen/beispielprojekt.json' geladen — Codex ist nicht verfügbar (Startvorlage trägt keinen vollständigen 'worker.codex'-Block (startziel/versionDeklariert/sandbox)); der Router fällt auf den fehleranfälligen claude-code-Klassifikationspfad zurück (F-337/F-373). Fix: LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`
- Git: 9bdfc1a, Node v24.16.0, win32 x64, Arbeitsordner `C:\Users\stefa\Projekte\ai-workforce`
- Start 2026-10-10T20:49:13.966Z, Ende 2026-10-10T21:09:19.256Z
- Modern Standby während der Messung: Standby beginnt 20:54:46 UTC, Standby endet 20:54:48 UTC

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
| GET /api/zustand (alle 2 s) | 335 | 2938 | 494 (p95 664) |
| Event-Loop max je 60-s-Fenster | 562 | 6182 | 20 |

**Selbstabbruch:** freier Systemspeicher 1544 MB < 1536 MB (2026-10-10T21:09:16.980Z)

## Seitenwechsel — Zeit bis „Inhalt sichtbar“ (ms, Ziel P3 ≤ 500)

Kriterium (in der Seite, nach jedem Animation-Frame ab dem Setzen von `location.hash`): Hauptseiten — der Container `[data-view]` ist sichtbar, trägt ≥ 40 Zeichen Text, und keine Textzeile ist ein Ladehinweis (die deutschen `*.laedt`-Texte, z. B. „Lädt…“); `#/chat` — die Gesprächsfläche ist sichtbar und zeigt einen Verlaufseintrag oder den Leerzustand. Frist 10 s.

| Seite | Median | Max | Wechsel | nicht erreicht |
|---|---|---|---|---|
| `#/dashboard` | 1148 | 1471 | 3 | 0 |
| `#/roadmap` | 866 | 1264 | 4 | 0 |
| `#/workboard` | 1089 | 1263 | 3 | 0 |
| `#/attention` | 799 | 814 | 3 | 0 |
| `#/capabilities` | 294 | 392 | 3 | 0 |
| `#/chat` | 66 | 145 | 3 | 0 |

## GET /api/zustand frisch und spät (ms, Ziel P1 p95 ≤ 300)

| Abschnitt | Median | p95 | Max | Anzahl |
|---|---|---|---|---|
| frisch (erste 10 min) | 332 | 654 | 1661 | 250 |
| spät (letzte 10 min des Leerlaufs) | – | – | – | 0 |

## Zeiten je Poll-Quelle (Server, je 60-s-Fenster, ms)

| Quelle | max | größtes p95 | Median der p95 | Aufrufe |
|---|---|---|---|---|
| laeufe | 5191 | 1120 | 346 | 1086 |
| startfehler | 0 | 0 | 0 | 1086 |
| workflows | 390 | 118 | 36 | 1086 |
| gesamt | 5591 | 1201 | 388 | 1086 |
| workitems | 394 | 394 | 137 | 18 |

## Synchrone Strecken > 200 ms (Server): 1084

| Zeit (UTC) | Strecke | ms |
|---|---|---|
| 20:49:24 | `GET /api/zustand` | 5591 |
| 21:06:39 | `GET /api/zustand` | 1975 |
| 21:06:40 | `GET /api/zustand` | 1531 |
| 21:09:08 | `GET /api/zustand` | 1364 |
| 21:06:43 | `GET /api/zustand` | 1201 |
| 21:06:37 | `GET /api/zustand` | 1169 |
| 21:06:50 | `GET /api/zustand` | 1149 |
| 21:09:06 | `GET /api/zustand` | 1112 |
| 21:06:42 | `GET /api/zustand` | 1035 |
| 21:06:35 | `GET /api/zustand` | 979 |
| 21:09:02 | `GET /api/zustand` | 894 |
| 21:09:03 | `GET /api/zustand` | 780 |
| 20:54:47 | `GET /api/zustand` | 757 |
| 21:06:51 | `GET /api/zustand` | 743 |
| 20:49:18 | `GET /api/auftraege` | 714 |
| 21:06:45 | `GET /api/zustand` | 699 |
| 21:06:52 | `GET /api/zustand` | 690 |
| 21:07:26 | `GET /api/zustand` | 676 |
| 21:08:58 | `GET /api/zustand` | 659 |
| 21:07:32 | `GET /api/zustand` | 648 |
| 21:09:09 | `GET /api/zustand` | 608 |
| 21:09:04 | `GET /api/zustand` | 599 |
| 21:07:06 | `GET /api/zustand` | 598 |
| 21:06:44 | `GET /api/zustand` | 595 |
| 20:51:38 | `GET /api/auftraege` | 590 |

## Event-Loop (Ziel P2 max ≤ 200 ms je 60-s-Fenster): 20 von 20 Fenstern über 200 ms

- 20:50:14 UTC: max 6182 ms, p99 406 ms
- 20:51:14 UTC: max 487 ms, p99 373 ms
- 20:52:14 UTC: max 793 ms, p99 317 ms
- 20:53:14 UTC: max 550 ms, p99 321 ms
- 20:54:14 UTC: max 438 ms, p99 321 ms
- 20:55:14 UTC: max 761 ms, p99 315 ms
- 20:56:14 UTC: max 1146 ms, p99 322 ms
- 20:57:14 UTC: max 510 ms, p99 314 ms
- 20:58:14 UTC: max 557 ms, p99 308 ms
- 20:59:14 UTC: max 566 ms, p99 309 ms
- 21:00:14 UTC: max 426 ms, p99 299 ms
- 21:01:14 UTC: max 487 ms, p99 313 ms
- 21:02:14 UTC: max 1124 ms, p99 309 ms
- 21:03:14 UTC: max 405 ms, p99 310 ms
- 21:04:14 UTC: max 537 ms, p99 331 ms
- 21:05:14 UTC: max 518 ms, p99 354 ms
- 21:06:14 UTC: max 593 ms, p99 340 ms
- 21:07:14 UTC: max 1977 ms, p99 395 ms
- 21:08:14 UTC: max 1131 ms, p99 336 ms
- 21:09:14 UTC: max 1366 ms, p99 379 ms

## Seitenmetriken (DevTools-Protokoll, je Minute)

| Zeit (UTC) | JS-Heap MB | JS-Heap gesamt MB | DOM-Knoten | Listener | Dokumente | Layout-Objekte |
|---|---|---|---|---|---|---|
| 20:49:26 | 7 | 12 | 12998 | 166 | 1 | 1239 |
| 20:50:26 | 11 | 13 | 12009 | 166 | 1 | 674 |
| 20:51:26 | 14 | 14 | 15075 | 166 | 1 | 2273 |
| 20:52:26 | 12 | 17 | 13787 | 166 | 1 | 738 |
| 20:53:26 | 17 | 19 | 14209 | 166 | 1 | 1015 |
| 20:54:26 | 16 | 19 | 14960 | 166 | 1 | 540 |
| 20:55:26 | 13 | 22 | 14918 | 166 | 1 | 1011 |
| 20:56:26 | 16 | 18 | 15448 | 166 | 1 | 1067 |
| 20:57:26 | 24 | 25 | 18318 | 166 | 1 | 3140 |
| 20:58:26 | 16 | 20 | 15633 | 166 | 1 | 1257 |
| 20:59:26 | 22 | 25 | 16336 | 166 | 1 | 2127 |
| 21:00:26 | 13 | 19 | 14965 | 166 | 1 | 540 |
| 21:01:26 | 16 | 19 | 14945 | 166 | 1 | 1011 |
| 21:02:26 | 16 | 17 | 14945 | 166 | 1 | 683 |
| 21:03:26 | 16 | 20 | 16618 | 166 | 1 | 2014 |
| 21:04:26 | 16 | 18 | 14945 | 166 | 1 | 738 |
| 21:05:26 | 16 | 19 | 15215 | 166 | 1 | 1015 |
| 21:06:26 | 15 | 19 | 16032 | 166 | 1 | 1183 |
| 21:07:26 | 12 | 17 | 14929 | 166 | 1 | 1011 |
| 21:08:26 | 13 | 18 | 14929 | 166 | 1 | 683 |

## Heap-Snapshots (nach erzwungener Speicherbereinigung)

nicht erhoben

## Speicherverlauf (je Minute)

Max RSS Server 141 MB, max RSS Chromium 827 MB, min. freier Speicher 1544 MB; Wachstum ab der ersten Probe nach dem Laden bis Ende Warmlauf/Leerlauf: Server – %, Chromium – % (Faktor –, Ziel F-1015 ≤ 1,2).

| Zeit (UTC) | Server RSS MB | Chromium RSS MB | frei MB | claude.exe |
|---|---|---|---|---|
| 20:49:15 | 83 | 98 | 2675 | 10 |
| 20:49:31 | 117 | 319 | 2523 | 10 |
| 20:50:16 | 89 | 450 | 2362 | 10 |
| 20:51:16 | 98 | 505 | 2262 | 10 |
| 20:52:16 | 97 | 385 | 2411 | 10 |
| 20:53:16 | 97 | 522 | 2593 | 10 |
| 20:54:16 | 99 | 542 | 2530 | 10 |
| 20:55:16 | 99 | 436 | 2221 | 10 |
| 20:56:16 | 108 | 564 | 2082 | 10 |
| 20:57:16 | 110 | 821 | 1830 | 10 |
| 20:58:16 | 110 | 577 | 2246 | 10 |
| 20:59:16 | 110 | 827 | 2056 | 10 |
| 21:00:16 | 111 | 484 | 2111 | 10 |
| 21:01:16 | 112 | 591 | 1757 | 10 |
| 21:02:16 | 116 | 604 | 2824 | 10 |
| 21:03:16 | 112 | 622 | 2790 | 10 |
| 21:04:16 | 111 | 620 | 2634 | 10 |
| 21:05:16 | 113 | 632 | 2624 | 10 |
| 21:06:16 | 127 | 639 | 2142 | 10 |
| 21:07:16 | 137 | 557 | 1969 | 10 |
| 21:08:16 | 141 | 660 | 1776 | 10 |
| 21:09:16 | 141 | 642 | 1544 | 10 |
