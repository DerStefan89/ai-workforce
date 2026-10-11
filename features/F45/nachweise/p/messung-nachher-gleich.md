# Messung „nachher-gleich“ (scripts/messe-chat.mjs)

Erzeugt von `scripts/messe-chat.mjs` am 2026-10-11T10:18:50.828Z. Rohdaten: `messung-nachher-gleich.json`.

## Umgebung

- Modus: nur Leerlauf 60 min, Startseite `#/dashboard`, Seitenwechsel alle 60 s, danach Turns: 0 (jarvis)
- Startvorlage: Standard (ohne LEITSTAND_STARTVORLAGE_PFAD)
- Leitstand: `Leitstand läuft auf http://127.0.0.1:4199 (Startvorlage: startvorlagen/beispielprojekt.json, Projekte: ai-workforce, haushaltsbuch, haushaltsbuch2)`
- Warnung beim Start: `[F-391] Startvorlage 'startvorlagen/beispielprojekt.json' geladen — Codex ist nicht verfügbar (Startvorlage trägt keinen vollständigen 'worker.codex'-Block (startziel/versionDeklariert/sandbox)); der Router fällt auf den fehleranfälligen claude-code-Klassifikationspfad zurück (F-337/F-373). Fix: LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`
- Git: 9bdfc1a, Node v24.16.0, win32 x64, Arbeitsordner `C:\Users\stefa\Projekte\ai-workforce`
- Start 2026-10-11T09:18:30.551Z, Ende 2026-10-11T10:18:50.828Z
- Modern Standby während der Messung: keiner
- Energiemodus (Netzbetrieb / Akku): Beste Energieeffizienz / Ausgeglichen

**Zuschnitt:** ausgewertet bis 2026-10-11T10:18:50.828Z (Neuberechnung über den ganzen Zeitraum mit dem F-1015-Median-Kriterium (QA-Nachpass)); Quelle `messung-nachher-gleich.json`. Werte danach sind nicht enthalten.

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
| GET /api/zustand (alle 2 s) | 48 | 105 | 1747 (p95 65) |
| Event-Loop max je 60-s-Fenster | 34 | 1444 | 60 |

## Seitenwechsel — Zeit bis „Inhalt sichtbar“ (ms, Ziel P3 ≤ 500)

Kriterium (in der Seite, nach jedem Animation-Frame ab dem Setzen von `location.hash`): Hauptseiten — der Container `[data-view]` ist sichtbar, trägt ≥ 40 Zeichen Text, und keine Textzeile ist ein Ladehinweis (die deutschen `*.laedt`-Texte, z. B. „Lädt…“); `#/chat` — die Gesprächsfläche ist sichtbar und zeigt einen Verlaufseintrag oder den Leerzustand. Frist 10 s.

| Seite | Median | Max | Wechsel | nicht erreicht |
|---|---|---|---|---|
| `#/dashboard` | 284 | 359 | 9 | 0 |
| `#/roadmap` | 130 | 210 | 10 | 0 |
| `#/workboard` | 120 | 149 | 10 | 0 |
| `#/attention` | 93 | 123 | 10 | 0 |
| `#/capabilities` | 68 | 110 | 10 | 0 |
| `#/chat` | 26 | 43 | 10 | 0 |

## GET /api/zustand frisch und spät (ms, Ziel P1 p95 ≤ 300)

| Abschnitt | Median | p95 | Max | Anzahl |
|---|---|---|---|---|
| frisch (erste 10 min) | 42 | 63 | 101 | 291 |
| spät (letzte 10 min des Leerlaufs) | 53 | 68 | 103 | 290 |

## Zeiten je Poll-Quelle (Server, je 60-s-Fenster, ms)

| Quelle | max | größtes p95 | Median der p95 | Aufrufe |
|---|---|---|---|---|
| workitems | 718 | 718 | 52 | 50 |
| laeufe | 1075 | 57 | 51 | 3537 |
| startfehler | 0 | 0 | 0 | 3537 |
| workflows | 48 | 16 | 9 | 3537 |
| gesamt | 1104 | 73 | 62 | 3537 |

## Synchrone Strecken > 200 ms (Server): 1

| Zeit (UTC) | Strecke | ms |
|---|---|---|
| 09:18:34 | `GET /api/chat` | 1433 |

## Event-Loop (Ziel P2 max ≤ 200 ms je 60-s-Fenster): 1 von 60 Fenstern über 200 ms

- 09:19:31 UTC: max 1444 ms, p99 20 ms

## Seitenmetriken (DevTools-Protokoll, je Minute)

| Zeit (UTC) | JS-Heap MB | JS-Heap gesamt MB | DOM-Knoten | Listener | Dokumente | Layout-Objekte |
|---|---|---|---|---|---|---|
| 09:18:35 | 7 | 14 | 12422 | 166 | 1 | 969 |
| 09:19:35 | 9 | 12 | 12016 | 166 | 1 | 683 |
| 09:20:35 | 10 | 15 | 13117 | 166 | 1 | 998 |
| 09:21:35 | 12 | 17 | 13803 | 166 | 1 | 738 |
| 09:22:35 | 16 | 19 | 13955 | 166 | 1 | 784 |
| 09:23:35 | 13 | 17 | 14955 | 166 | 1 | 540 |
| 09:24:35 | 15 | 17 | 14944 | 166 | 1 | 1011 |
| 09:25:35 | 13 | 17 | 14926 | 166 | 1 | 683 |
| 09:26:35 | 13 | 18 | 14926 | 166 | 1 | 998 |
| 09:27:35 | 17 | 18 | 14951 | 166 | 1 | 738 |
| 09:28:35 | 16 | 19 | 14950 | 166 | 1 | 784 |
| 09:29:35 | 12 | 16 | 14958 | 166 | 1 | 540 |
| 09:30:35 | 15 | 18 | 14940 | 166 | 1 | 1011 |
| 09:31:35 | 16 | 19 | 14951 | 166 | 1 | 683 |
| 09:32:35 | 17 | 21 | 15782 | 166 | 1 | 1423 |
| 09:33:35 | 13 | 20 | 14926 | 166 | 1 | 738 |
| 09:34:35 | 16 | 19 | 14948 | 166 | 1 | 784 |
| 09:35:35 | 12 | 18 | 14958 | 166 | 1 | 540 |
| 09:36:35 | 14 | 17 | 14940 | 166 | 1 | 1011 |
| 09:37:35 | 17 | 19 | 15223 | 166 | 1 | 849 |
| 09:38:35 | 16 | 18 | 14951 | 166 | 1 | 998 |
| 09:39:35 | 17 | 21 | 14951 | 166 | 1 | 738 |
| 09:40:35 | 15 | 18 | 14942 | 166 | 1 | 784 |
| 09:41:35 | 16 | 18 | 14983 | 166 | 1 | 540 |
| 09:42:35 | 15 | 18 | 14940 | 166 | 1 | 1011 |
| 09:43:35 | 18 | 22 | 15235 | 166 | 1 | 899 |
| 09:44:35 | 15 | 17 | 14944 | 166 | 1 | 998 |
| 09:45:35 | 17 | 21 | 14949 | 166 | 1 | 738 |
| 09:46:35 | 16 | 18 | 14943 | 166 | 1 | 784 |
| 09:47:35 | 16 | 18 | 14981 | 166 | 1 | 540 |
| 09:48:35 | 14 | 17 | 14933 | 166 | 1 | 1011 |
| 09:49:35 | 16 | 19 | 15021 | 166 | 1 | 731 |
| 09:50:35 | 16 | 18 | 14950 | 166 | 1 | 998 |
| 09:51:35 | 17 | 21 | 14949 | 166 | 1 | 738 |
| 09:52:35 | 17 | 19 | 14947 | 166 | 1 | 784 |
| 09:53:35 | 16 | 18 | 15052 | 166 | 1 | 544 |
| 09:54:35 | 15 | 18 | 14940 | 166 | 1 | 1011 |
| 09:55:35 | 16 | 18 | 15222 | 166 | 1 | 849 |
| 09:56:35 | 17 | 19 | 14949 | 166 | 1 | 998 |
| 09:57:35 | 17 | 21 | 14949 | 166 | 1 | 738 |
| 09:58:35 | 14 | 17 | 14937 | 166 | 1 | 784 |
| 09:59:35 | 15 | 17 | 14974 | 166 | 1 | 540 |
| 10:00:35 | 17 | 19 | 15986 | 166 | 1 | 1579 |
| 10:01:35 | 16 | 18 | 15161 | 166 | 1 | 805 |
| 10:02:35 | 18 | 20 | 16058 | 166 | 1 | 1653 |
| 10:03:35 | 17 | 20 | 14949 | 166 | 1 | 738 |
| 10:04:35 | 16 | 20 | 14947 | 166 | 1 | 784 |
| 10:05:35 | 16 | 19 | 15051 | 166 | 1 | 544 |
| 10:06:35 | 14 | 17 | 14939 | 166 | 1 | 1011 |
| 10:07:35 | 16 | 19 | 15161 | 166 | 1 | 805 |
| 10:08:35 | 17 | 19 | 15780 | 166 | 1 | 1423 |
| 10:09:35 | 16 | 19 | 14949 | 166 | 1 | 738 |
| 10:10:35 | 15 | 17 | 14944 | 166 | 1 | 784 |
| 10:11:35 | 17 | 19 | 15051 | 166 | 1 | 544 |
| 10:12:35 | 15 | 18 | 14937 | 166 | 1 | 1011 |
| 10:13:35 | 16 | 18 | 14948 | 166 | 1 | 683 |
| 10:14:35 | 16 | 18 | 14948 | 166 | 1 | 998 |
| 10:15:35 | 17 | 21 | 14948 | 166 | 1 | 738 |
| 10:16:35 | 15 | 18 | 14945 | 166 | 1 | 784 |
| 10:17:35 | 12 | 17 | 14957 | 166 | 1 | 540 |
| 10:18:35 | 15 | 18 | 14938 | 166 | 1 | 1011 |
| 10:18:48 | 12 | 19 | 14928 | 166 | 1 | 683 |

## Heap-Snapshots (nach erzwungener Speicherbereinigung)

| Zeitpunkt | Datei | Datei MB | Heap MB | Knoten | Detached DOM |
|---|---|---|---|---|---|
| nach dem Laden | `features/F45/nachweise/p/heap-nachher-gleich-start.heapsnapshot` | 14.6 | 14 | 142237 | 0 |
| Ende | `features/F45/nachweise/p/heap-nachher-gleich-ende.heapsnapshot` | 17.6 | 20.6 | 186325 | 0 |

Top-Wachstum (Eigengröße, Gruppen nach Konstruktor bzw. Knotentyp):

| Gruppe | Anzahl Start | Anzahl Ende | KB Start | KB Ende | KB Zuwachs |
|---|---|---|---|---|---|
| `(string)` | 41890 | 68201 | 4040 | 8533 | 4494 |
| `(code)` | 18419 | 21585 | 998 | 1871 | 873 |
| `native: blink::NetworkResourcesData::ResourceData` | 104 | 2097 | 29 | 590 | 561 |
| `object: Object` | 3385 | 6285 | 134 | 288 | 154 |
| `native: Text` | 5786 | 7278 | 497 | 625 | 128 |
| `native: blink::ShareableElementData` | 1590 | 3343 | 101 | 195 | 94 |
| `native: blink::ImmutableCSSPropertyValueSet` | 744 | 1082 | 94 | 150 | 56 |
| `native: PerformanceLongAnimationFrameTiming` | 2 | 200 | 0 | 34 | 34 |
| `native: system / WeakArrayList` | 87 | 307 | 5 | 38 | 33 |
| `native: blink::HeapHashTableBacking<blink::HashTable<blink::ShapeCacheKey, blink::KeyVal` | 20 | 36 | 28 | 58 | 30 |
| `native: blink::ScriptTimingInfo` | 2 | 202 | 0 | 27 | 27 |
| `(object shape)` | 2990 | 3469 | 177 | 200 | 23 |
| `native: PerformanceScriptTiming` | 2 | 202 | 0 | 24 | 23 |
| `native: blink::HeapHashTableBacking<blink::HashTable<blink::FontDescription, blink::KeyV` | 1 | 1 | 20 | 40 | 20 |
| `native: PerformanceResourceTiming` | 103 | 250 | 14 | 33 | 20 |

## Speicherverlauf (je Minute)

F-1015 über Mediane (Minute 15–20 gegen die letzten 5 min): Chromium 679 → 691 MB (1.02), JS-Heap 16 → 15 MB (0.94), DOM-Knoten 14951 → 14948 (1), Listener 166 → 166 (1) — erfüllt.

F-1015 Einzelproben (Ende ≤ 1,2 × Wert nach 15 min): Chromium 679 → 581 MB (Faktor 0.86), JS-Heap 16 → 12 MB (0.75), DOM-Knoten 14948 → 14928 (1), Listener 166 → 166 (1) — erfüllt.

Max RSS Server 220 MB, max RSS Chromium 732 MB, min. freier Speicher 3858 MB; Wachstum ab der ersten Probe nach dem Laden bis Ende Warmlauf/Leerlauf: Server 50 %, Chromium 64 % (Faktor 1.64, Ziel F-1015 ≤ 1,2).

| Zeit (UTC) | Server RSS MB | Chromium RSS MB | frei MB | claude.exe |
|---|---|---|---|---|
| 09:18:31 | 82 | 99 | 4556 | 10 |
| 09:18:40 | 134 | 355 | 4311 | 10 |
| 09:19:32 | 117 | 430 | 4240 | 10 |
| 09:20:32 | 145 | 371 | 4045 | 10 |
| 09:21:32 | 143 | 415 | 4433 | 10 |
| 09:22:32 | 145 | 578 | 4123 | 10 |
| 09:23:32 | 144 | 421 | 4444 | 10 |
| 09:24:32 | 202 | 533 | 4325 | 10 |
| 09:25:32 | 199 | 436 | 4259 | 10 |
| 09:26:32 | 202 | 446 | 4268 | 10 |
| 09:27:32 | 204 | 628 | 4256 | 10 |
| 09:28:32 | 199 | 630 | 4327 | 10 |
| 09:29:32 | 203 | 642 | 4249 | 10 |
| 09:30:32 | 203 | 570 | 4372 | 10 |
| 09:31:32 | 202 | 670 | 4422 | 10 |
| 09:32:32 | 201 | 681 | 3985 | 10 |
| 09:33:32 | 210 | 525 | 3858 | 10 |
| 09:34:32 | 213 | 679 | 4046 | 10 |
| 09:35:32 | 214 | 538 | 4072 | 10 |
| 09:36:32 | 207 | 635 | 4101 | 10 |
| 09:37:32 | 211 | 725 | 3973 | 10 |
| 09:38:32 | 213 | 718 | 3981 | 10 |
| 09:39:32 | 212 | 721 | 4026 | 10 |
| 09:40:32 | 212 | 650 | 4084 | 10 |
| 09:41:32 | 213 | 717 | 4099 | 10 |
| 09:42:32 | 214 | 634 | 4213 | 10 |
| 09:43:32 | 210 | 732 | 4248 | 10 |
| 09:44:32 | 213 | 666 | 4310 | 10 |
| 09:45:32 | 215 | 707 | 4192 | 10 |
| 09:46:32 | 212 | 656 | 4264 | 10 |
| 09:47:32 | 213 | 702 | 4197 | 10 |
| 09:48:32 | 215 | 587 | 4295 | 10 |
| 09:49:32 | 216 | 722 | 4158 | 10 |
| 09:50:32 | 214 | 717 | 4169 | 10 |
| 09:51:32 | 215 | 709 | 4141 | 10 |
| 09:52:32 | 215 | 692 | 4100 | 10 |
| 09:53:32 | 212 | 710 | 4451 | 10 |
| 09:54:32 | 213 | 636 | 4485 | 10 |
| 09:55:32 | 213 | 720 | 4382 | 10 |
| 09:56:32 | 218 | 710 | 4383 | 10 |
| 09:57:32 | 214 | 711 | 4341 | 10 |
| 09:58:32 | 215 | 615 | 4442 | 10 |
| 09:59:32 | 215 | 649 | 4333 | 10 |
| 10:00:32 | 217 | 702 | 4267 | 10 |
| 10:01:32 | 214 | 712 | 4129 | 10 |
| 10:02:32 | 215 | 711 | 4123 | 10 |
| 10:03:32 | 217 | 713 | 4154 | 10 |
| 10:04:32 | 214 | 695 | 4148 | 10 |
| 10:05:32 | 215 | 708 | 4113 | 10 |
| 10:06:32 | 216 | 633 | 4034 | 10 |
| 10:07:32 | 220 | 715 | 4013 | 10 |
| 10:08:32 | 213 | 716 | 4010 | 10 |
| 10:09:32 | 216 | 716 | 4048 | 10 |
| 10:10:32 | 120 | 676 | 4144 | 10 |
| 10:11:32 | 148 | 704 | 4373 | 10 |
| 10:12:32 | 148 | 621 | 4417 | 10 |
| 10:13:32 | 122 | 703 | 4369 | 10 |
| 10:14:32 | 125 | 704 | 4395 | 10 |
| 10:15:32 | 152 | 707 | 4346 | 10 |
| 10:16:32 | 152 | 682 | 4329 | 10 |
| 10:17:32 | 153 | 699 | 4431 | 10 |
| 10:18:32 | 203 | 631 | 4439 | 10 |
| 10:18:47 | 201 | 581 | 4478 | 10 |
