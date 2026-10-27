# F45 W2a — Gates: Läufer + Inventur — Plan v1

Stand 27.10.2026, Branch `f45/w2a-gates-laeufer` (= main `5ce0b47`, nach B5b-3 #387). Auftrag Challenger 27.10.2026 nach
E-W2-1; W2-Schnitt W2a Läufer+Inventur → W2b Codeform-Gates abbauen → W2c Regeln mit Ratsche → W2d Doku-Diät,
Server-Monolith gestrichen. Advisor-Pass fällig: Umbau der Prüfkette (alle Gates laufen künftig über ein neues Skript).

## CONTEXT

- `package.json` `check:gates` = 122 Befehle als `&&`-Kette (2× `npm run …`, 120× `node scripts/check-*.mjs`), seriell,
  bricht beim ersten roten Gate ab. Einzeln gemessen Σ 704 s (`features/F45/nachweise/t/messung.md`, Rohdaten
  `messung-teillog.txt`, alle 122 grün). `check` = `check:gates && test && aufraeumen-nachlauf` bleibt.
- Vorbild `scripts/teste.mjs` (F45 T): exportierte, explizite `SERIELL`-Liste, parallele Gruppe zuerst, serielle danach auch
  bei Rot, Exit der ersten roten Gruppe, Kopfkommentar mit Begründung.
- Einziger Code, der die Kette liest: `scripts/messe-check.mjs` `gateBefehle(paketJson)` (split an `&&`) — muss mit.
- CI `.github/workflows/ci.yml` ruft nur `npm run check` und `check-f20-leitstand-shell.mjs` → kennt die Kette nicht,
  bleibt unverändert (Auftrag 2).
- Regel 1j (F-713/F-735, `src/aenderungsuebersicht/index.ts:398`): ein `ausfuehrung`-Lauf darf die Prüfkette nicht
  unbemerkt ändern; geschützt sind `package.json` (scripts) und u. a. `scripts/check-*`. Eine neue Gate-Quelle muss unter
  diese Muster fallen, sonst öffnet W2a eine Lücke (ein Lauf könnte Gates aus der Liste streichen, ohne dass 1j hält).
- F-1205: Speichermangel in der Sitzung bei paralleler Last; Messung: kein Gate-Prozess > 270 MB Node-RSS, größtes Δ System
  eines Gates 330 MB (`check-f14-abbruch`), `npm run lint` 295 MB.

## 1 Eine Quelle + Läufer: `scripts/check-gates.mjs` (neu)

Entscheidung: Liste **im Läufer selbst** als exportierte Konstanten (Muster `SERIELL` in `teste.mjs`), keine JSON-Datei.
Gründe: eine Datei statt zwei; Kommentare je Eintrag möglich (warum seriell); der Name `scripts/check-gates.mjs` fällt unter
das 1j-Muster `scripts/check-*` — die Prüfkette bleibt gegen Änderungen durch einen Lauf geschützt, ohne
`STANDARD_PRUEFKETTEN_MUSTER` anzufassen.

- `export const GATES` — die 122 Befehlszeilen **wörtlich** aus der heutigen Kette, gleiche Reihenfolge (Strings wie
  `'node scripts/check-docs.mjs'`, `'npm run lint'`). Ausgeführt per `spawn(befehl, { shell: true })` — gleiche Semantik wie
  bisher unter `npm run` (Shell, geerbte Umgebung inkl. `node_modules/.bin` im PATH), `stdin` ignoriert.
- `export const SERIELL` — Teilmenge von `GATES`, die einzeln läuft, nachdem die parallele Gruppe fertig ist (kein anderes
  Gate gleichzeitig). Kriterien, je Eintrag als Kommentar: (a) fester Port oder geteilte Ressource außerhalb eines
  Wegwerf-Ordners (Repo-Arbeitsbaum, `kontrollzustand/` des Repos, fester tmp-/Home-Pfad, git mit Schreibwirkung im Repo),
  (b) große Speicherspitze. Lange Laufzeit allein ist **kein** Grund (würde die Wanduhr verlängern). Inhalt aus der
  Inventur (§3, Spalte Parallel-Risiko; Lesen aller 122 Gate-Dateien, 27.10.2026). Befund: **kein** Gate bindet einen
  festen Port (alle `listen(0)`), keins schreibt mit git ins echte Repo, keins beendet Prozesse nach Namen. Mindestens 43 Gates
  legen aber `kontrollzustand-test-…-<uuid>` **in der Repo-Wurzel** an und löschen sie wieder (gitignoriert, Namen
  eindeutig — untereinander kollisionsfrei). Daraus vier Gruppen (12 Gates, Σ ≈ 91 s einzeln gemessen):
  1. Durchlaufen den ganzen Repo-Baum und stolpern über parallel entstehende/verschwindende Ordner (ENOENT, Funde in
     fremden Wegwerf-Ordnern): `check-docs` (`sammleDateinamen('.')`), `check-rules` (`sammleDateien('.')`),
     `check-f45-k-kontext` (`sammleDateinamen`), `check-secrets` (gitleaks `--no-git` über den Arbeitsbaum).
  2. Schreiben/löschen feste Dateien in `startvorlagen/` des Repos (andere Gates, z. B. `check-f16-codex-gateway` (e),
     lesen jede Datei dort): `check-f10-leitstand`, `check-f14-abbruch`, `check-f15-automat-real`.
  3. Messen Zeit gegen feste Grenzen (unter Last wacklig): `check-f43-projekt-aufrufen`, `check-f20-zustand-poll`,
     `check-fix-zustand-poll-kosten`, `check-f652-pruefschritt`.
  4. Vergleicht das echte `~/.ai-workforce` vor/nach und meldet jede Änderung: `check-f45-f3b1-freigabe`.
  Kein Gate wegen Speicher (größte Spitzen 270 MB Node-RSS / 330 MB Δ liegen im Rahmen von N = 4).
- Parallelität: Standard **4** = `--test-concurrency` der parallelen Testgruppe in `teste.mjs`; die Testgruppe läuft im
  frischen Terminal mit Prozessen bis 357 MB Δ — vier Gates (≤ 330 MB Δ je Gate) liegen im selben Rahmen. Änderbar über
  `AIW_GATES_PARALLEL` (ganze Zahl ≥ 1; `1` = alles nacheinander wie vorher, für die Sitzung nach F-1205). Ungültiger Wert ⇒
  Exit 2 vor dem ersten Gate (kein stiller Rückfall).
- Ablauf: parallele Gruppe in Listenreihenfolge, höchstens N gleichzeitig; danach SERIELL einzeln — auch wenn die parallele
  Gruppe rot ist (wie `teste.mjs`). Abweichung von der Kette: nach einem roten Gate laufen die übrigen weiter (alle roten auf
  einmal sichtbar); das Urteil je Gate und das Gesamturteil (rot ⇔ mindestens ein Gate rot) bleiben gleich.
- Ausgabe: je Gate ein Block, sobald es fertig ist (nicht verschränkt): Kopfzeile `✓|✗ <befehl> (<s> s)` plus die
  vollständige gepufferte Ausgabe (stdout+stderr) des Gates — keine Information geht gegenüber der Kette verloren. Am Ende:
  Anzahl grün/rot, Liste der roten mit Exit-Code, Wanduhr gesamt, Σ der Einzelzeiten, die fünf langsamsten.
- Exit: 0 wenn alle grün, sonst 1; 2 bei Aufruffehler (Zusatzargumente, ungültiges `AIW_GATES_PARALLEL`, SERIELL-Eintrag
  nicht in GATES, doppelter Eintrag). Ein Gate, das nicht startet oder per Signal endet, ist rot (Grund in der Ausgabe).
- Reine/testbare Teile exportiert: `leseParallelitaet(env)`, `pruefeListe(gates, seriell)`, `fuehreGatesAus(gates, seriell,
  { parallelitaet, schreibe })` → `{ ergebnisse, exit }`. Direkter Aufruf nur am Haupteinstieg (Muster `teste.mjs`).
- `package.json`: `"check:gates": "node scripts/check-gates.mjs"`. Sonst nichts.

## 2 `scripts/messe-check.mjs`

`gateBefehle(paketJson)` entfällt; die Messung nimmt `GATES` aus `check-gates.mjs` (dynamischer Import im Direktmodus, damit
der Hakenmodus klein bleibt). Kopfkommentar nachziehen.

## 3 Inventur `features/F45/w2-gate-inventur.md`

Tabelle aller 122 Gates: Gate, Zeilen (`wc -l` der Datei; lint/typecheck „–“), Dauer s (messung-teillog.txt), Kategorie
(Verhalten / Invariante / Codeform / Sicherheit / gemischt), Server ja/nein (importiert, startet oder liest
`leitstand-server.mjs`), Kandidat W2b (behalten / ersetzen durch Test / löschen) mit Halbsatz Grund, Parallel-Risiko.
Sicherheit (csrf, host, authorization-boundary, secrets, wirkungsmarke, human-transport) immer „behalten“. Kopf: Methode
(Klassifizierung durch Lesen der Gate-Dateien, je Gate ein Urteil — DEKLARIERT, keine Messung), Summen je Kategorie
(Anzahl, Zeilen, Sekunden) und je Kandidat. Keine Änderung an einem Gate (W2b).

## 4 Akte, Findings, Lagebild

- `features/F45/feature.md`: B5b-3 `erledigt`, Abgenommen 2026-10-27 (Merge #387), Ist „–“ (Begonnen 2026-10-27 ⇒ 0 AT,
  Regel `roadmap-planung.ts`), Notiz + „gemergt #387“; Satz im Abschnitt „Stand B5b-3“ auf den Merge beziehen. W2:
  `laeuft`, Begonnen 2026-10-27, Schätzung 1,8–3,1, Notiz „Schnitt W2a–W2d (Challenger 27.10.2026), Server-Monolith
  gestrichen“. Abschnitt „Stand W2a“ (kurz).
- `state/findings.md`: F-1220–F-1224 (Auftrag 5). Danach `node scripts/erzeuge-lagebild.mjs`.

## Tests / Nachweis in der Sitzung (keine schweren Läufe)

- Neu `scripts/check-gates.test.mjs` (node:test): (1) `pruefeListe` — Duplikat, SERIELL ∉ GATES ⇒ Fehler; echte Liste
  ohne Fehler, jede `node scripts/…`-Datei existiert. (2) `leseParallelitaet` — fehlt ⇒ 4, „2“ ⇒ 2, „0“/„x“/„1.5“/„-1“ ⇒
  Fehler. (3) `fuehreGatesAus` mit Pseudo-Gates (`node -e …`): ein absichtlich rotes Gate (Exit 3, Ausgabe „ROT-MARKE“) ⇒
  exit 1, alle übrigen liefen trotzdem, Ausgabe des roten Gates im Block; höchstens N gleichzeitig (Start/Ende-Zeiten);
  SERIELL-Gate überlappt mit keinem anderen; alle grün ⇒ exit 0.
- Gleichheit der Liste: einmaliger Abgleich `GATES` gegen die Kette aus `git show main:package.json` (122 = 122, gleiche
  Reihenfolge) — Nachweis im Bericht, kein dauerhafter Test (W2b streicht Einträge).
- Trockenlauf: Läufer mit einer kleinen Auswahl leichter Gates (über eine Test-Hilfe bzw. ein Wegwerf-Skript, das
  `fuehreGatesAus` mit 5–6 Einträgen ≤ 1 s aufruft), `node --test scripts/check-gates.test.mjs`, `npm run lint`,
  `npm run typecheck`, `check-docs`, `check-rules`, `check-f21-workboard`, `check-f40-lagebild`, `check-feature`,
  `check-akte-meilenstein`, `check-status-akten`.
- Voller Gate-Lauf über den neuen Läufer (mit Wanduhr), `npm run test`: nur im Commit-Block (Stefan, frisches Terminal).

## Risiken

- Versteckte Kopplung zweier Gates (gleiche Ressource) ⇒ Wackler nur parallel. Gegenmittel: Inventur-Spalte
  Parallel-Risiko, SERIELL; `AIW_GATES_PARALLEL=1` als Rückfallebene ohne Codeänderung.
- Speicher (F-1205): vier gleichzeitige Gates in der Sitzung — Sitzung fährt keinen vollen Lauf; Commit-Block im frischen
  Terminal.
- Ausgabe gepuffert: ein hängendes Gate zeigt erst am Ende etwas — wie bisher hängt die Kette dann ebenfalls; kein Timeout
  (YAGNI, keins vorher).

## Nicht-Ziele

Kein Gate ändern/löschen/zusammenlegen (W2b). Keine Änderung an `npm run test`, `check`, CI. Keine Dauer-Sortierung, kein
Timeout, keine Log-Datei, kein Fail-fast-Schalter.

## Offene Punkte, nicht stillschweigend entschieden

1. Liste im Läufer (`.mjs`) statt `scripts/gates.json`: begründet mit 1j-Muster und Kommentaren. Gegenargument: Daten
   und Code in einer Datei; W2b ändert dann ein Skript statt einer Liste.
2. Standard N = 4: abgeleitet aus `teste.mjs`, nicht für Gates gemessen.
3. Weiterlaufen nach Rot statt Abbruch beim ersten roten Gate (Kette): ändert das Laufverhalten, nicht das Urteil.
4. SERIELL Gruppe 1: Repo-Baum-Läufer seriell statt die Schreiber (`kontrollzustand-test-*` in der Repo-Wurzel, ≥ 43
   Gates) auf `mkdtemp` umzustellen — Umstellen wäre eine Gate-Änderung (W2b).
5. `npm run lint`/`typecheck` in der Inventur: Werkzeug-Analyse ohne Textmuster — als „Invariante“ geführt, nicht
   „Codeform“ (blockiert keine Umbauten).
