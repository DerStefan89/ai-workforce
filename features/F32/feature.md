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
- UI-Ansicht der Verbrauchsprojektion im Leitstand (kommt mit F32 WS-2).
- Kosten in Euro/USD — `total_cost_usd` wird bewusst nie übernommen
  (Abo-Modell, Entscheidung 30, keine Scheingenauigkeit).
- Aggregation nach Feature/Meilenstein (kommt mit F33, sobald `roadmap.json`
  existiert).
- Änderung des Rohstrom-Formats — `verbrauch` liest ausschließlich aus dem
  bereits vorhandenen, unveränderten Ergebnisobjekt/Ereignisstrom.
- `kontingent_beobachtet` (Fenstertyp/`resetsAt`/`utilization`/`status`,
  §12) — siehe WS-1-Befund unten: die real geprüfte Laufausgabe trägt diese
  Felder nicht, das Feld wird deshalb in WS-1 nicht gebaut, nicht nur nicht
  befüllt.

## Workstreams
- **WS-0 — Akte.** Diese Datei.
- **WS-1 — Laufakte-Feld + Projektion.** Additives, optionales
  `LaufakteV0Daten.verbrauch`-Feld (Schema + Validator + Typ + Beispiele),
  befüllt in `starteGateway` (claude-code) und `starteCodexGateway`
  (codex); Projektion `GET /api/verbrauch`
  (`scripts/leitstand/routen-verbrauch.mjs`); Gate
  `scripts/check-f32-verbrauch.mjs`.

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
- **UI-Ansicht offen (WS-2, noch nicht begonnen):** `GET /api/verbrauch`
  ist bislang nur über die API erreichbar, keine Leitstand-Darstellung.
- **`?von=`/`?bis=` ohne eigene Formatprüfung (Reviewer-/QA-Pass,
  20.09.2026):** der Filter vergleicht die Query-Werte unverändert
  lexikographisch gegen `erstellt_am` (ISO-8601, immer mit `Z`-Suffix, da
  `jetzt()`/`new Date().toISOString()` schreibt). Ein syntaktisch
  fehlerhafter oder vertauschter `von`/`bis`-Wert liefert dadurch still ein
  leeres statt eines fehlerhaften Ergebnisses — sieht wie „keine Läufe" aus
  statt wie ein ungültiger Parameter. Bewusst nicht in WS-1 behoben (kein
  UI-Konsument existiert noch, der einen falschen Query-Wert erzeugen
  könnte); bei WS-2 (UI-Datumsauswahl) zu bewerten, ob eine Format-/
  Reihenfolgeprüfung mit eigener Fehlermeldung nötig wird.
- **Überladene `null`-Gruppierung (Reviewer-/QA-Pass, 20.09.2026):**
  `rolle`/`modell`/`auftragId` werden `null`, wenn kein Kontextpaket
  existiert, wenn es existiert aber das Feld leer ist, oder (bei `modell`)
  wenn `leseModellBeobachtet` mehrdeutig war (mehrere `modelUsage`-
  Schlüssel). Alle drei Fälle fallen in dieselbe Gruppe und sind aus der
  Projektion allein nicht unterscheidbar. Kein Fehlverhalten (korrekt
  gruppiert nach dem, was bekannt ist), aber für WS-2 als UX-Frage
  vorzumerken. Real beobachtet im AK6-Nachweislauf: `modelUsage` trug zwei
  Schlüssel (Haiku-Subagent + Sonnet-Antwort), `leseModellBeobachtet`
  liefert dort korrekt `null` (mehrdeutig, F-059/F-061) — die Gruppe zeigt
  `modell: null`, obwohl real ein bekanntes Modell geantwortet hat
  (`features/F32/nachweis-verbrauch.md` Abschnitt 4).

## Feature Review
Noch nicht fällig — WS-2 (UI-Ansicht) steht aus.
