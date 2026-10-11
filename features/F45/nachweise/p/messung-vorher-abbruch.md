# Messung „vorher“ (scripts/messe-chat.mjs)

Erzeugt von `scripts/messe-chat.mjs` am 2026-10-10T20:44:31.535Z. Rohdaten: `messung-vorher-abbruch.json`.

**Hinweis (nachgetragen):** Selbstabbruch nach 15 min bei 955 MB frei. Ursache außerhalb der Messung: Firefox ≈ 5,0 GB, Claude-App ≈ 1,7 GB, WebView2 ≈ 1 GB; Mess-Leitstand flach (Server ≤ 139 MB, Chromium 400–660 MB). Wiederholung mit 60 min: `messung-vorher.md`. Datei des Start-Snapshots umbenannt in `heap-vorher-abbruch-start.heapsnapshot`.

## Umgebung

- Modus: nur Leerlauf 120 min, Startseite `#/dashboard`, Seitenwechsel alle 60 s, danach Turns: 0 (jarvis)
- Startvorlage: Standard (ohne LEITSTAND_STARTVORLAGE_PFAD)
- Leitstand: `Leitstand läuft auf http://127.0.0.1:4199 (Startvorlage: startvorlagen/beispielprojekt.json, Projekte: ai-workforce, haushaltsbuch, haushaltsbuch2)`
- Warnung beim Start: `[F-391] Startvorlage 'startvorlagen/beispielprojekt.json' geladen — Codex ist nicht verfügbar (Startvorlage trägt keinen vollständigen 'worker.codex'-Block (startziel/versionDeklariert/sandbox)); der Router fällt auf den fehleranfälligen claude-code-Klassifikationspfad zurück (F-337/F-373). Fix: LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`
- Git: 9bdfc1a, Node v24.16.0, win32 x64, Arbeitsordner `C:\Users\stefa\Projekte\ai-workforce`
- Start 2026-10-10T20:29:27.954Z, Ende 2026-10-10T20:44:31.535Z
- Modern Standby während der Messung: keiner

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
| GET /api/zustand (alle 2 s) | 343 | 1251 | 376 (p95 643) |
| Event-Loop max je 60-s-Fenster | 627 | 1742 | 15 |

**Selbstabbruch:** freier Systemspeicher 955 MB < 1536 MB (2026-10-10T20:44:29.989Z)

## Seitenwechsel — Zeit bis „Inhalt sichtbar“ (ms, Ziel P3 ≤ 500)

Kriterium (in der Seite, nach jedem Animation-Frame ab dem Setzen von `location.hash`): Hauptseiten — der Container `[data-view]` ist sichtbar, trägt ≥ 40 Zeichen Text, und keine Textzeile ist ein Ladehinweis (die deutschen `*.laedt`-Texte, z. B. „Lädt…“); `#/chat` — die Gesprächsfläche ist sichtbar und zeigt einen Verlaufseintrag oder den Leerzustand. Frist 10 s.

| Seite | Median | Max | Wechsel | nicht erreicht |
|---|---|---|---|---|
| `#/dashboard` | 1461 | 1765 | 2 | 0 |
| `#/roadmap` | 984 | 1216 | 3 | 0 |
| `#/workboard` | 899 | 1261 | 3 | 0 |
| `#/attention` | 1026 | 1354 | 2 | 0 |
| `#/capabilities` | 290 | 317 | 2 | 0 |
| `#/chat` | 100 | 145 | 2 | 0 |

## GET /api/zustand frisch und spät (ms, Ziel P1 p95 ≤ 300)

| Abschnitt | Median | p95 | Max | Anzahl |
|---|---|---|---|---|
| frisch (erste 10 min) | 336 | 642 | 1240 | 253 |
| spät (letzte 10 min des Leerlaufs) | – | – | – | 0 |

## Zeiten je Poll-Quelle (Server, je 60-s-Fenster, ms)

| Quelle | max | größtes p95 | Median der p95 | Aufrufe |
|---|---|---|---|---|
| laeufe | 697 | 492 | 337 | 833 |
| startfehler | 0 | 0 | 0 | 833 |
| workflows | 152 | 49 | 39 | 833 |
| gesamt | 751 | 639 | 383 | 833 |
| workitems | 227 | 227 | 133 | 14 |

## Synchrone Strecken > 200 ms (Server): 838

| Zeit (UTC) | Strecke | ms |
|---|---|---|
| 20:40:09 | `GET /api/zustand` | 752 |
| 20:39:46 | `GET /api/zustand` | 677 |
| 20:43:51 | `GET /api/auftraege` | 671 |
| 20:41:17 | `GET /api/zustand` | 643 |
| 20:39:50 | `GET /api/zustand` | 639 |
| 20:37:46 | `GET /api/auftraege` | 624 |
| 20:41:49 | `GET /api/auftraege` | 583 |
| 20:39:55 | `GET /api/zustand` | 547 |
| 20:35:43 | `GET /api/auftraege` | 545 |
| 20:41:28 | `GET /api/zustand` | 542 |
| 20:39:54 | `GET /api/zustand` | 525 |
| 20:31:41 | `GET /api/auftraege` | 511 |
| 20:38:47 | `GET /api/auftraege` | 506 |
| 20:38:36 | `GET /api/zustand` | 493 |
| 20:40:06 | `GET /api/zustand` | 485 |
| 20:37:25 | `GET /api/zustand` | 483 |
| 20:41:58 | `GET /api/zustand` | 483 |
| 20:32:42 | `GET /api/auftraege` | 478 |
| 20:44:04 | `GET /api/zustand` | 476 |
| 20:44:06 | `GET /api/zustand` | 474 |
| 20:39:49 | `GET /api/zustand` | 471 |
| 20:39:52 | `GET /api/zustand` | 467 |
| 20:41:48 | `GET /api/zustand` | 458 |
| 20:38:52 | `GET /api/zustand` | 457 |
| 20:41:55 | `GET /api/zustand` | 454 |

## Event-Loop (Ziel P2 max ≤ 200 ms je 60-s-Fenster): 15 von 15 Fenstern über 200 ms

- 20:30:28 UTC: max 439 ms, p99 338 ms
- 20:31:28 UTC: max 693 ms, p99 324 ms
- 20:32:28 UTC: max 517 ms, p99 310 ms
- 20:33:28 UTC: max 482 ms, p99 323 ms
- 20:34:28 UTC: max 430 ms, p99 320 ms
- 20:35:28 UTC: max 377 ms, p99 309 ms
- 20:36:28 UTC: max 1146 ms, p99 310 ms
- 20:37:28 UTC: max 570 ms, p99 329 ms
- 20:38:28 UTC: max 627 ms, p99 330 ms
- 20:39:29 UTC: max 1010 ms, p99 339 ms
- 20:40:29 UTC: max 753 ms, p99 317 ms
- 20:41:29 UTC: max 644 ms, p99 325 ms
- 20:42:29 UTC: max 1742 ms, p99 355 ms
- 20:43:29 UTC: max 411 ms, p99 314 ms
- 20:44:29 UTC: max 891 ms, p99 391 ms

## Seitenmetriken (DevTools-Protokoll, je Minute)

| Zeit (UTC) | JS-Heap MB | JS-Heap gesamt MB | DOM-Knoten | Listener | Dokumente | Layout-Objekte |
|---|---|---|---|---|---|---|
| 20:29:31 | 9 | 17 | 13560 | 166 | 4 | 1426 |
| 20:30:31 | 12 | 14 | 12043 | 166 | 1 | 693 |
| 20:31:31 | 13 | 15 | 14272 | 166 | 1 | 1848 |
| 20:32:31 | 12 | 22 | 13812 | 166 | 1 | 738 |
| 20:33:31 | 16 | 19 | 13966 | 166 | 1 | 784 |
| 20:34:31 | 12 | 20 | 14964 | 166 | 1 | 540 |
| 20:35:31 | 14 | 16 | 14953 | 166 | 1 | 1011 |
| 20:36:31 | 14 | 18 | 14936 | 166 | 1 | 683 |
| 20:37:31 | 12 | 17 | 14926 | 166 | 1 | 998 |
| 20:38:31 | 16 | 21 | 15634 | 166 | 1 | 1257 |
| 20:39:31 | 12 | 18 | 14928 | 166 | 1 | 784 |
| 20:40:31 | 14 | 20 | 14966 | 166 | 1 | 540 |
| 20:41:31 | 15 | 20 | 14943 | 166 | 1 | 1011 |
| 20:42:31 | 17 | 19 | 15375 | 166 | 1 | 1019 |
| 20:43:31 | 16 | 18 | 15777 | 166 | 1 | 1423 |

## Heap-Snapshots (nach erzwungener Speicherbereinigung)

nicht erhoben

## Speicherverlauf (je Minute)

Max RSS Server 139 MB, max RSS Chromium 660 MB, min. freier Speicher 955 MB; Wachstum ab der ersten Probe nach dem Laden bis Ende Warmlauf/Leerlauf: Server – %, Chromium – % (Faktor –, Ziel F-1015 ≤ 1,2).

| Zeit (UTC) | Server RSS MB | Chromium RSS MB | frei MB | claude.exe |
|---|---|---|---|---|
| 20:29:28 | 83 | 99 | 3175 | 10 |
| 20:29:36 | 109 | 361 | 2974 | 10 |
| 20:30:29 | 90 | 546 | 2805 | 10 |
| 20:31:29 | 97 | 548 | 2705 | 10 |
| 20:32:29 | 97 | 401 | 2923 | 10 |
| 20:33:29 | 98 | 566 | 2838 | 10 |
| 20:34:29 | 98 | 416 | 3041 | 10 |
| 20:35:29 | 98 | 516 | 2880 | 10 |
| 20:36:29 | 110 | 508 | 2489 | 10 |
| 20:37:29 | 114 | 460 | 2485 | 10 |
| 20:38:29 | 114 | 614 | 2094 | 10 |
| 20:39:29 | 113 | 473 | 2405 | 10 |
| 20:40:29 | 114 | 525 | 2472 | 10 |
| 20:41:29 | 114 | 610 | 1792 | 10 |
| 20:42:29 | 135 | 660 | 1726 | 10 |
| 20:43:29 | 138 | 655 | 1833 | 10 |
| 20:44:29 | 139 | 660 | 955 | 10 |
