# Messung „vorher“ (scripts/messe-chat.mjs)

Erzeugt von `scripts/messe-chat.mjs` am 2026-10-11T19:48:34.225Z. Rohdaten: `messung-vorher.json`.

## Umgebung

- Modus: nur Leerlauf 10 min, Startseite `#/dashboard`, Seitenwechsel aus, danach Turns: 0 (jarvis)
- Startvorlage: Standard (ohne LEITSTAND_STARTVORLAGE_PFAD)
- Leitstand: `Leitstand läuft auf http://127.0.0.1:4199 (Startvorlage: startvorlagen/ai-workforce.json — aus dem Projektregister (Eintrag 'ai-workforce'), Projekte: ai-workforce, haushaltsbuch, haushaltsbuch2)`
- Git: febcc86, Node v24.16.0, win32 x64, Arbeitsordner `C:\Users\stefa\Projekte\ai-workforce`
- Start 2026-10-11T19:37:40.529Z, Ende 2026-10-11T19:48:34.225Z
- Modern Standby während der Messung: keiner
- Energiemodus (Netzbetrieb / Akku): Beste Energieeffizienz / Ausgeglichen

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
| GET /api/zustand (alle 2 s) | 51 | 269 | 296 (p95 123) |
| Event-Loop max je 60-s-Fenster | 41 | 1818 | 10 |

## Seitenwechsel — Zeit bis „Inhalt sichtbar“ (ms, Ziel P3 ≤ 500)

Kriterium (in der Seite, nach jedem Animation-Frame ab dem Setzen von `location.hash`): Hauptseiten — der Container `[data-view]` ist sichtbar, trägt ≥ 40 Zeichen Text, und keine Textzeile ist ein Ladehinweis (die deutschen `*.laedt`-Texte, z. B. „Lädt…“); `#/chat` — die Gesprächsfläche ist sichtbar und zeigt einen Verlaufseintrag oder den Leerzustand. Frist 10 s.

| Seite | Median | Max | Wechsel | nicht erreicht |
|---|---|---|---|---|

## GET /api/zustand frisch und spät (ms, Ziel P1 p95 ≤ 300)

| Abschnitt | Median | p95 | Max | Anzahl |
|---|---|---|---|---|
| frisch (erste 10 min) | 51 | 123 | 269 | 288 |
| spät (letzte 10 min des Leerlaufs) | 51 | 122 | 203 | 288 |

## Zeiten je Poll-Quelle (Server, je 60-s-Fenster, ms)

| Quelle | max | größtes p95 | Median der p95 | Aufrufe |
|---|---|---|---|---|
| workitems | 2079 | 2079 | 2079 | 2 |
| laeufe | 22362 | 18121 | 53 | 559 |
| startfehler | 0 | 0 | 0 | 559 |
| workflows | 2533 | 2530 | 14 | 559 |
| gesamt | 24890 | 20651 | 68 | 559 |

## Synchrone Strecken > 200 ms (Server): 3

| Zeit (UTC) | Strecke | ms |
|---|---|---|
| 19:37:50 | `GET /api/chat` | 1814 |
| 19:37:51 | `GET /api/roadmap` | 1111 |
| 19:37:52 | `GET /api/projektakte` | 208 |

## Event-Loop (Ziel P2 max ≤ 200 ms je 60-s-Fenster): 1 von 10 Fenstern über 200 ms

- 19:38:41 UTC: max 1818 ms, p99 292 ms

## Seitenmetriken (DevTools-Protokoll, je Minute)

| Zeit (UTC) | JS-Heap MB | JS-Heap gesamt MB | DOM-Knoten | Listener | Dokumente | Layout-Objekte |
|---|---|---|---|---|---|---|
| 19:38:16 | 6 | 8 | 12910 | 166 | 1 | 981 |
| 19:39:16 | 12 | 15 | 12527 | 166 | 1 | 691 |
| 19:40:16 | 11 | 13 | 12528 | 166 | 1 | 691 |
| 19:41:16 | 12 | 14 | 12532 | 166 | 1 | 691 |
| 19:42:16 | 7 | 13 | 12508 | 166 | 1 | 691 |
| 19:43:16 | 7 | 13 | 12508 | 166 | 1 | 691 |
| 19:44:16 | 9 | 15 | 12511 | 166 | 1 | 691 |
| 19:45:16 | 8 | 15 | 12512 | 166 | 1 | 691 |
| 19:46:16 | 10 | 16 | 12516 | 166 | 1 | 691 |
| 19:47:16 | 10 | 13 | 12521 | 166 | 1 | 691 |
| 19:48:16 | 11 | 15 | 12525 | 166 | 1 | 691 |
| 19:48:31 | 6 | 14 | 12504 | 166 | 1 | 691 |

## Heap-Snapshots (nach erzwungener Speicherbereinigung)

| Zeitpunkt | Datei | Datei MB | Heap MB | Knoten | Detached DOM |
|---|---|---|---|---|---|
| nach dem Laden | `features/F45/nachweise/b1b2/heap-vorher-start.heapsnapshot` | 14.9 | 14.4 | 145912 | 0 |
| Ende | `features/F45/nachweise/b1b2/heap-vorher-ende.heapsnapshot` | 15 | 14.8 | 146319 | 0 |

Top-Wachstum (Eigengröße, Gruppen nach Konstruktor bzw. Knotentyp):

| Gruppe | Anzahl Start | Anzahl Ende | KB Start | KB Ende | KB Zuwachs |
|---|---|---|---|---|---|
| `(code)` | 18595 | 18391 | 1008 | 1251 | 243 |
| `native: blink::NetworkResourcesData::ResourceData` | 111 | 415 | 31 | 117 | 86 |
| `native: PerformanceResourceTiming` | 110 | 250 | 15 | 33 | 19 |
| `native: system / WeakArrayList` | 87 | 217 | 5 | 17 | 12 |
| `native: blink::HeapHashTableBacking<blink::HashTable<blink::String, blink::KeyValuePair<` | 8 | 8 | 14 | 26 | 12 |
| `native: PerformanceLongAnimationFrameTiming` | 11 | 79 | 2 | 14 | 12 |
| `native: blink::ScriptTimingInfo` | 8 | 76 | 1 | 10 | 9 |
| `native: TaskAttributionTiming` | 8 | 76 | 1 | 9 | 8 |
| `native: PerformanceScriptTiming` | 8 | 76 | 1 | 9 | 8 |
| `native: PerformanceLongTaskTiming` | 8 | 76 | 1 | 8 | 7 |
| `native: blink::HeapHashTableBacking<blink::HashTable<cppgc::internal::BasicMember<blink:` | 291 | 292 | 36 | 42 | 6 |
| `(object shape)` | 3101 | 3132 | 182 | 183 | 2 |
| `native: blink::HeapVectorBacking<cppgc::internal::BasicMember<blink::TaskAttributionTimi` | 8 | 76 | 0 | 2 | 2 |
| `native: blink::HeapVectorBacking<cppgc::internal::BasicMember<blink::PerformanceScriptTi` | 8 | 76 | 0 | 2 | 2 |
| `native: system / ProtectedFixedArray` | 14 | 64 | 0 | 1 | 1 |

## Speicherverlauf (je Minute)

F-1015 (Ende ≤ 1,2 × Wert nach 15 min): nicht bestimmbar (Leerlauf kürzer als 15 min oder keine Proben).

Max RSS Server 208 MB, max RSS Chromium 561 MB, min. freier Speicher 2494 MB; Wachstum ab der ersten Probe nach dem Laden bis Ende Warmlauf/Leerlauf: Server 92 %, Chromium 24 % (Faktor 1.24, Ziel F-1015 ≤ 1,2).

| Zeit (UTC) | Server RSS MB | Chromium RSS MB | frei MB | claude.exe |
|---|---|---|---|---|
| 19:37:42 | 82 | 90 | 3197 | 10 |
| 19:38:21 | 105 | 343 | 3137 | 10 |
| 19:38:44 | 116 | 397 | 2947 | 10 |
| 19:39:44 | 118 | 416 | 2933 | 10 |
| 19:40:44 | 146 | 457 | 3102 | 10 |
| 19:41:44 | 145 | 474 | 2975 | 10 |
| 19:42:44 | 147 | 529 | 2600 | 10 |
| 19:43:44 | 149 | 529 | 2545 | 10 |
| 19:44:44 | 202 | 547 | 2494 | 10 |
| 19:45:44 | 206 | 561 | 2840 | 10 |
| 19:46:44 | 206 | 405 | 2947 | 10 |
| 19:47:44 | 208 | 441 | 3202 | 10 |
| 19:48:30 | 202 | 425 | 3100 | 10 |
