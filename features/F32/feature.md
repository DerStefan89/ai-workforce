# F32 — Verbrauch & Kontingent

## ID
F32

## Titel
Verbrauch & Kontingent

## Status
Status: IN_ARBEIT

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Den realen Verbrauch (Tokens, Dauer) jedes Laufs aus der bereits vorhandenen
Laufausgabe (Claude-Code-Ergebnisobjekt, Codex-JSONL) in die Laufakte
übernehmen und über einen Leitstand-Endpunkt nach Rolle, Worker, Modell und
Auftrag gruppiert summiert ausweisen — Rang OBSERVED, additiv, ohne den
Rohstrom oder die bestehende Laufakte-Hülle zu verändern
(`docs/projekt/zielfassung.md` §9.4 E-190, §12 Kontingent).

## Nicht-Ziele
- Kosten in Euro/USD — `total_cost_usd` wird bewusst nie übernommen
  (Abo-Modell, Entscheidung 30, keine Scheingenauigkeit).
- Kontingent-Anzeige (`kontingent_beobachtet`, §12) — WS-1 hat real belegt,
  dass die Laufausgabe keine Rate-Limit-/Fenster-Felder trägt (siehe
  "Bekannte Grenzen" unten); WS-2 zeigt deshalb ausschließlich Verbrauch,
  kein Kontingent. `state/findings.md` F-508 bleibt damit nur teilweise
  erledigt.
- Freie Datumsauswahl (WS-2) — drei feste, client-seitig berechnete
  Zeiträume (7 Tage/30 Tage/gesamt) statt eines Eingabefelds, das einen
  syntaktisch ungültigen `?von=`/`?bis=`-Wert erzeugen könnte (siehe
  WS-1-Bekannte-Grenze zum Zeitraumfilter).
- Aggregation nach Feature/Meilenstein (kommt mit F33, sobald `roadmap.json`
  existiert).
- Änderung des Rohstrom-Formats — `verbrauch` liest ausschließlich aus dem
  bereits vorhandenen, unveränderten Ergebnisobjekt/Ereignisstrom.

## Workstreams
- **WS-0 — Akte.** Diese Datei.
- **WS-1 — Laufakte-Feld + Projektion.** Additives, optionales
  `LaufakteV0Daten.verbrauch`-Feld (Schema + Validator + Typ + Beispiele),
  befüllt in `starteGateway` (claude-code) und `starteCodexGateway`
  (codex); Projektion `GET /api/verbrauch`
  (`scripts/leitstand/routen-verbrauch.mjs`); Gate
  `scripts/check-f32-verbrauch.mjs`.
- **WS-2 — Verbrauchsansicht im Leitstand.** `holeVerbrauch`
  (`public/leitstand/api.js`, Muster `holeRoadmap`); reine
  Zeitraum-Berechnung `berechneVerbrauchsVon`
  (`public/leitstand/verbrauch-zeitraum.js`, drei feste Zeiträume 7 Tage/
  30 Tage/gesamt, kein freies Datumsfeld); Karte "Verbrauch" im Dashboard
  (`public/leitstand/views/dashboard.js`, NICHT `views/workboard.js`) mit
  Zeitraum-Umschalter, Gesamtzahlen (Läufe, ohne Beobachtung) und je einer
  Tabelle nach Rolle und nach Modell (Tokens ein/aus/Cache); null-Gruppen
  als "unbekannt" mit erklärendem Tooltip. Geladen beim Öffnen der View
  (Bootstrap) und bei Zeitraumwechsel, NICHT im 2-Sekunden-Poll (Muster
  `views/workboard.js` `ladeRoadmap`). Gate
  `scripts/check-f32-verbrauch-ansicht.mjs`.

## Akzeptanzkriterien
- AK1 (WS-1): `schemas/kontrollzustand-laufakte-payload.schema.json` und
  `validiereLaufakteDaten` (`src/claude-code-gateway/index.ts`) kennen ein
  optionales `verbrauch`-Objekt (`input_tokens`, `output_tokens`,
  `cache_read_tokens`, `cache_write_tokens`, `dauer_ms`, `dauer_api_ms`,
  `turns`, `quelle`). Eine Laufakte ohne das Feld bleibt gültig
  (append-only, Muster `worker`/`modell_deklariert`, E-M2-5).
- AK2 (WS-1): `starteGateway` befüllt `verbrauch` aus dem
  `"type":"result"`-Ergebnisobjekt (`leseVerbrauch`), wenn `usage` und
  `duration_ms` als Zahlen vorliegen — sonst bleibt das Feld weg, nie
  geschätzt.
- AK3 (WS-1): `starteCodexGateway` befüllt `verbrauch` aus dem
  `turn.completed`-Ereignis des JSONL-Stroms (`leseVerbrauchCodex`), wenn
  dessen `usage` vier Zahlenfelder trägt; `dauer_ms` ist eine vom Gateway
  selbst genommene, reale Wanduhr-Differenz um den Prozessstart (kein
  JSONL-Feld dafür vorhanden); `dauer_api_ms`/`turns` bleiben null (keine
  Quelle im Strom).
- AK4 (WS-1): `GET /api/verbrauch` (`baueVerbrauchsProjektion`) liest alle
  Laufakten des Projekts über die Lineage (`lineage-laufakte-`-Präfix),
  gruppiert nach `rolle` (aus dem Kontextpaket), `worker`,
  `modell_beobachtet ?? modell_deklariert` und `auftrag_id`, summiert
  `verbrauch` je Gruppe und weist Läufe ohne das Feld unter
  `ohneBeobachtung` aus (zählen mit, fließen in keine Summe ein).
  Zeitraumfilter `?von=&bis=` grenzt über `erstellt_am` ein; ein Lauf ohne
  `erstellt_am` bleibt vom Filter unberührt.
- AK5 (WS-1): `scripts/check-f32-verbrauch.mjs` prüft einen Rot-Fall
  (Laufakte mit ungültigem `verbrauch` wird von `validiereLaufakteDaten`
  abgelehnt), einen Grün-Fall (Laufakte ohne das Feld bleibt gültig) und
  die Projektion gegen zwei reale Fixture-Laufakten (claude-code + codex)
  plus einen dritten Lauf ohne Beobachtung. In `npm run check` eingehängt.
- AK6 (WS-1, Nachweis vor Commit-Freigabe, 20.09.2026): ein realer
  `claude.exe`-Lauf über den Worktree-Code liefert eine Laufakte mit
  befülltem `verbrauch` und erscheint in `GET /api/verbrauch` als eigene
  Gruppe mit Summe > 0 — `features/F32/nachweis-verbrauch.md`. Zusätzlich
  gegen 87 reale claude-code-Läufe (4 Rollen) und 12 reale Codex-
  `turn.completed`-Ereignisse im Hauptrepo-Corpus geprüft: alle vier
  erwarteten `usage`-Schlüssel durchgehend vorhanden, keine negativen/
  nicht-ganzzahligen Werte, `reasoning_output_tokens` durchgehend eine
  Teilmenge von `output_tokens` (nachweis-verbrauch.md Abschnitte 1–3).
- AK7 (WS-2): `berechneVerbrauchsVon` liefert für `'7t'`/`'30t'` ein
  ISO-8601-`von` genau 7 bzw. 30 Tage vor dem übergebenen Bezugszeitpunkt,
  für `'gesamt'` `undefined` (kein Zeitraumfilter) — reine Funktion, kein
  Datei-/Netzwerkzugriff.
- AK8 (WS-2): die Karte "Verbrauch" zeigt Summen je Rolle und je Modell
  (Tokens ein/aus/Cache), Anzahl Läufe und Anzahl "ohne Beobachtung";
  `rolle`/`modell` gleich `null` erscheinen als "unbekannt" mit Tooltip,
  keine Ausgrenzung aus der Anzeige. Keine Kosten in Euro/USD.
- AK9 (WS-2): `scripts/check-f32-verbrauch-ansicht.mjs` prüft
  `berechneVerbrauchsVon` gegen einen festen Bezugszeitpunkt (AK7) und
  einen echten HTTP-Aufruf `GET /api/verbrauch` mit einem client-seitig
  gebauten `von`-Wert gegen einen über `erzeugeRequestHandler` erzeugten
  Testserver → 200, erwartete Struktur `{ gruppen, laeufeGesamt,
  ohneBeobachtungGesamt }`. In `npm run check` eingehängt.
- AK10 (WS-2): die Karte lädt `GET /api/verbrauch` ausschließlich beim
  Öffnen des Dashboards und bei Zeitraumwechsel — der bestehende
  2-Sekunden-Poll (`zustand.js`) löst keinen zusätzlichen Abruf aus.

## Dependencies
- F6a (Claude-Code-Gateway) — `starteGateway`/`leseErgebnisobjekt`, die
  WS-1 um `leseVerbrauch` ergänzt.
- F16 (Codex-Gateway) — `starteCodexGateway`/`leseCodexEreignisse`, die
  WS-1 um `leseVerbrauchCodex` ergänzt.
- F2 (Lineage Registry) — `registriereKernArtefakt`/`ladeArtefaktVersion`,
  über die die Projektion alle Laufakten eines Projekts liest.
- F12 (Bedienbarer Lauf) — liefert das Kontextpaket-Artefakt
  (`kontextpaket-<laufId>`), aus dem die Projektion `rolle` und den
  Auftragsbezug (`artefakt:auftrag-<auftragId>`) liest (E-M2-4-Konvention).

## Bekannte Grenzen
- **Schlüsselbild ohne Cache-Write real unbelegt (Nachweis vor
  Commit-Freigabe, 20.09.2026):** von 87 real geprüften claude-code-Läufen
  hatte KEINER `cache_creation_input_tokens === 0` — jeder Lauf im Corpus
  hatte mindestens etwas Cache-Write. Ob ein Lauf ganz ohne Cache-Write ein
  anderes `usage`-Schlüsselbild trägt (z. B. das Feld fehlt statt `0` zu
  sein), ist deshalb nicht real belegt, nur aus der API-Konvention
  plausibel angenommen. `leseVerbrauch`s Alles-oder-nichts-Prüfung bleibt
  deshalb unverändert streng (kein Feld gilt als optional `0`) — sicherer
  Fehlschlag (kein `verbrauch` geschrieben) statt eines ungeprüften
  Zugeständnisses. Neu zu prüfen, sobald ein realer Lauf ohne Cache-Write
  auftritt. Details: `features/F32/nachweis-verbrauch.md` Abschnitt 1.
- **Kontingent-Felder real geprüft, nicht vorhanden (WS-1, 20.09.2026):**
  vor dem Bau von `kontingent_beobachtet` wurden alle 5269 real
  vorhandenen Rohereignisströme unter `kontrollzustand-roh/` (gitignored,
  lokal im Hauptrepo) nach `resetsAt`, `utilization`, `five_hour`,
  `seven_day`, `rate_limit`/`rateLimit` durchsucht — kein Treffer. Das
  `"type":"result"`-Ergebnisobjekt eines realen Claude-Code-Laufs (siehe
  `kontrollzustand-roh/jarvis-jarvis-chat-*`) trägt `duration_api_ms`,
  `stop_reason`, `session_id`, `total_cost_usd`, `usage`, `modelUsage`,
  `permission_denials`, `terminal_reason`, `fast_mode_state`,
  `subagent_stats`, `is_error`, `num_turns`, `subtype`,
  `api_error_status`, `result`, `ttft_ms`, `type`, `duration_ms`, `uuid`,
  `ttft_stream_ms`, `time_to_request_ms`, `queued_turn_count` — keine
  Rate-Limit-/Fenster-Felder. `kontingent_beobachtet` (§12) bleibt deshalb
  ein Nicht-Ziel dieser Iteration, kein unbelegter Bau. Neu zu prüfen,
  sobald eine künftige CLI-Version solche Felder liefert.
- **`verbrauch` ist additiv und optional, kein rückwirkender Pflichtwert
  (WS-1):** jede vor F32 geschriebene Laufakte bleibt ohne das Feld
  gültig — dieselbe append-only-Logik wie `worker`/`modell_deklariert`
  (F16) und `erstellt_am` (E-M2-5).
- **`?von=`/`?bis=` ohne eigene Formatprüfung, durch feste Zeiträume
  entschärft (WS-1: Reviewer-/QA-Pass 20.09.2026; WS-2: 22.09.2026):** der
  Filter vergleicht die Query-Werte unverändert lexikographisch gegen
  `erstellt_am` (ISO-8601, immer mit `Z`-Suffix). Ein syntaktisch
  fehlerhafter oder vertauschter `von`/`bis`-Wert liefert dadurch still ein
  leeres statt eines fehlerhaften Ergebnisses. WS-2 umgeht das Risiko, statt
  es zu beheben: `berechneVerbrauchsVon` (`public/leitstand/verbrauch-
  zeitraum.js`) ist die einzige Quelle, die `von` an die Karte "Verbrauch"
  übergibt, und liefert für alle drei festen Zeiträume immer ein gültiges
  ISO-8601-Datum — kein Eingabefeld, das einen fehlerhaften Wert erzeugen
  könnte. Der Endpunkt selbst bleibt ungeprüft; ein künftiger zweiter
  UI-Konsument mit freier Datumsauswahl bräuchte die Formatprüfung dann
  real.
- **Überladene `null`-Gruppierung, jetzt sichtbar (WS-1: Reviewer-/QA-Pass
  20.09.2026; WS-2: 22.09.2026):** `rolle`/`modell`/`auftragId` werden
  `null`, wenn kein Kontextpaket existiert, wenn es existiert aber das Feld
  leer ist, oder (bei `modell`) wenn `leseModellBeobachtet` mehrdeutig war
  (mehrere `modelUsage`-Schlüssel, F-059/F-061). Alle Fälle fallen in
  dieselbe Gruppe und sind aus der Projektion allein nicht unterscheidbar.
  WS-2 zeigt eine solche Gruppe als "unbekannt" mit je einem eigenen
  Tooltip für Rolle ("Rolle zu diesem Lauf nicht ermittelbar") und Modell
  ("Modell mehrdeutig oder nicht beobachtet") statt eines gemeinsamen,
  gleich allgemeinen Textes — kein Fehlverhalten, unterscheidet aber
  weiterhin nicht zwischen den drei Ursachen (fehlendes Kontextpaket,
  leeres Feld, Mehrdeutigkeit).
- **Kontingent bleibt offen (WS-2):** die Karte "Verbrauch" zeigt
  ausschließlich Verbrauch (Tokens, Läufe) — die von `state/findings.md`
  F-508 ursprünglich verlangte Kontingent-Anzeige bleibt unerreichbar, weil
  die reale CLI-Laufausgabe keine Rate-Limit-/Fenster-Felder liefert
  (siehe WS-1-Befund oben). F-508 damit weiterhin nur teilweise erledigt.
- **Kein Gate/Test für die dashboard.js-internen Bausteine (QA-Pass,
  22.09.2026, F-601):** `scripts/check-f32-verbrauch-ansicht.mjs` prüft
  AK9-konform nur `berechneVerbrauchsVon` und den rohen Endpunkt, nicht
  Aggregation/Anzeige/Überholschutz in `dashboard.js` — kein F32-Einzelfall,
  kein View-Renderer im Repo hat eigene Unit-Tests.
- **Kein Browser-Realtest bei ~400px für die sechsspaltige Tabelle
  (QA-Pass, 22.09.2026, F-602):** sitebreites, vorbestehendes Muster (kein
  Repo-Table hat einen `overflow-x:auto`-Wrapper), kein F32-spezifischer
  Regressionsbefund, aber auch nicht real widerlegt.

## Feature Review
Noch nicht fällig — WS-2 ist gebaut, Stefans Verifikation und der formale
Feature-Review-Pass (Muster F33/F40) stehen aus. Status bleibt `IN_ARBEIT`.

Reviewer-/QA-Pass (frischer Kontext, 22.09.2026) vor Commit-Freigabe:
**code-reviewer** „Freigegeben mit Hinweisen" (keine Blocker; ein Punkt vor
Commit behoben: `catch` in `ladeVerbrauch` protokolliert den Fehler jetzt
über `console.error`, Muster `views/workboard.js` `ladeRoadmap`). **qa**
zunächst „Nicht freigegeben" wegen eines echten Bedienbarkeits-Mangels:
ein fehlgeschlagener Abruf des bereits aktiven Zeitraums (insbesondere des
Standardzeitraums `30t` beim Bootstrap) ließ sich nicht erneut versuchen,
da ein Klick auf den aktiven Zeitraum-Button ein No-Op war — behoben
(`initVerbrauchBedienung` löst jetzt auch bei Klick auf den aktiven
Zeitraum neu, wenn dessen letzter Abruf fehlgeschlagen ist). Zusätzlich
behoben: der Rolle-Tooltip nannte mit "Kontextpaket" internes
Artefaktvokabular (F-476-Geruch) — auf "Rolle zu diesem Lauf nicht
ermittelbar" vereinfacht, "Bekannte Grenzen" oben entsprechend an den
tatsächlichen (zwei unterschiedlichen) Tooltip-Wortlaut angepasst. Zwei
verbleibende, nicht blockierende Befunde als F-601/F-602 registriert
(siehe oben).
