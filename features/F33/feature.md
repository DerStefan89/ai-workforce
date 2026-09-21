# F33 — Projektkontext & Roadmap

## ID
F33

## Titel
Projektkontext & Roadmap

## Status
Status: IN_ARBEIT

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Ein Projekt trägt seine Beschreibung, seine Anweisungen und seine Roadmap als
Dateien im eigenen Repo; der Context Builder speist sie für lesende Rollen
ein (`docs/projekt/zielfassung.md` E-M4-2, "Kontrollzustand im eigenen
Repo" — Git führt, kein zweiter Speicher).

## Nicht-Ziele
- "Wo stehen wir?"-Antwort, Roadmap-Projektion im Workboard, HTTP-Routen,
  UI (kommt mit F33 WS-2).
- Neue Rollen.
- Ein Abhängigkeitsgraph zwischen Meilensteinen/Features.
- Prüfung, ob eine in `roadmap.json.meilensteine[].features` genannte
  Feature-ID tatsächlich eine `features/<id>/feature.md` besitzt — reine
  Zuordnung in WS-1, keine Querverweisprüfung.
- Auto-Erzeugung von Projektkontext/Roadmap für neu importierte Projekte
  (`docs/projekt/zielfassung.md` §13.5 "Nicht in Meilenstein 4":
  "Roadmap-/Workitem-Erzeugung für neue Projekte").

## Workstreams
- **WS-0 — Spike (wegwerfbar).** Messfrage: lädt eine `claude`-Sitzung mit
  `--setting-sources ''` die `CLAUDE.md` des Arbeitsverzeichnisses noch?
  Ergebnis: NEIN — real mit zwei kalibrierten `claude -p`-Läufen belegt
  (`features/F33/spike-setting-sources.md`). Konsequenz für WS-1: die Rolle
  `jarvis` (läuft seit F31 WS-3 mit `''`) bekommt Projektkontext
  ausschließlich über eine explizite Einspeisung; `router` behält `'project'`
  und lädt `CLAUDE.md` weiterhin selbst, bekommt die drei neuen
  Kontextdateien aber ebenfalls eingespeist, weil sie nicht Teil von
  `CLAUDE.md` sind.
- **WS-1 — Projektkontext als Repo-Dateien.** Drei neue Repo-Dateien
  (`docs/projekt/kontext/beschreibung.md`, `docs/projekt/kontext/
  anweisungen.md`, `docs/projekt/roadmap.json`), `schemas/roadmap.schema.json`
  (ROADMAP_V0) + `validiereRoadmapDaten`/`ladeRoadmap`
  (`src/projektkontext/index.ts`), additive optionale Felder `kontext_pfad`/
  `roadmap_pfad` in `schemas/projekte.schema.json` +
  `validiereProjekteDaten`, Einspeisung über den Context Builder
  (`baueProjektkontextAnfragen`, `scripts/leitstand-server.mjs`) für die
  Rollen `jarvis` und `router` (`notwendig: true`), gefiltert über
  `filtereExistierendeAnfragen` (QA-Pass-Nachtrag — eine fehlende
  Kontextdatei lässt den Lauf laufen statt ihn komplett zu blockieren), Gate
  `scripts/check-f33-projektkontext.mjs`.

## Akzeptanzkriterien
- AK1 (WS-0): zwei reale `claude -p`-Läufe (identisches Argv bis auf
  `--setting-sources`) belegen, ob `CLAUDE.md` unter `--setting-sources ''`
  geladen wird — vollständiges Argv, Exit-Code, Antwort-Auszug beider Läufe,
  Schlussfolgerung in einem Satz (`features/F33/spike-setting-sources.md`).
- AK2 (WS-1): `docs/projekt/kontext/beschreibung.md`,
  `docs/projekt/kontext/anweisungen.md` und `docs/projekt/roadmap.json`
  existieren mit echtem, aus `docs/projekt/zielfassung.md`/`docs/STATUS.md`
  abgeleitetem Inhalt (kein Platzhalter).
- AK3 (WS-1): `validiereRoadmapDaten` prüft `roadmap.json` gegen
  `schemas/roadmap.schema.json` (`roadmap_schema`, `vision`,
  `meilensteine[].{id,titel,status,features}`, additionalProperties: false,
  Meilenstein-id eindeutig) — Muster `validiereProjekteDaten`
  (`src/projekte/index.ts`, D5, kein ajv).
- AK4 (WS-1): `schemas/projekte.schema.json` bekommt die zwei additiven,
  optionalen Felder `kontext_pfad`/`roadmap_pfad` (relativ zu `repo_pfad`);
  die reale, unveränderte `projekte.json` bleibt ohne Migration gültig.
- AK5 (WS-1): `baueProjektkontextAnfragen` baut für die Rollen `jarvis` und
  `router` drei `notwendig: true`-Anfragen (Beschreibung, Anweisungen,
  Roadmap) — repo-relative Pfade, aus `kontext_pfad`/`roadmap_pfad` des
  Registereintrags aufgelöst, mit Standardpfaden aus Punkt AK2, wenn die
  Felder fehlen. `ausfuehrung` bleibt unverändert (CLAUDE.md ist dort die
  Anweisung, keine Dublette); `baueKontextpaket`s Budget-/Ausschlusslogik
  bleibt unangetastet.
- AK6 (WS-1): `scripts/check-f33-projektkontext.mjs` prüft: die drei Dateien
  existieren und sind nicht leer; die reale `roadmap.json` ist über
  `ladeRoadmap` gültig; mindestens ein Rot-Fall (unbekanntes Feld, falscher
  `status`, doppelte Meilenstein-id, falsches `roadmap_schema`) wird von
  `validiereRoadmapDaten` abgelehnt; die reale `projekte.json` bleibt gültig;
  ein über `baueKontextpaket` real gebautes Kontextpaket enthält für BEIDE
  Rollen (`jarvis`, `router`) alle drei Projektkontext-Elemente, zusammen mit
  einer realistisch vorangestellten Auftragsreferenz, innerhalb des realen
  `standardBudget` (QA-Pass-Befund: Budget-Interaktion mit der immer
  vorangestellten Auftragsreferenz war zunächst ungetestet). In
  `npm run check` eingehängt.
- AK7 (WS-1, QA-Pass-Befund, kritisch): ein Projekt OHNE vorbereitete
  Kontextdateien (`kontext_pfad`/`roadmap_pfad` zeigt ins Leere — der
  wahrscheinlichste Fall beim nächsten über F25/E-M4-2 importierten Projekt,
  da Auto-Erzeugung ausdrücklich Nicht-Ziel ist) blockiert `jarvis`/`router`
  NICHT komplett: `filtereExistierendeAnfragen`
  (`scripts/leitstand-server.mjs`) lässt eine fehlende Anfrage-Datei still
  weg, bevor `loeseAusfuehrungsEingabenAuf`s unbedingte Existenzprüfung (F11
  WS-2 AK6) sonst die GESAMTE Eingaben-Auflösung mit 400 abgelehnt hätte —
  real über `scripts/check-f33-projektkontext.mjs` Abschnitt (f) gegen einen
  echten `POST /api/chat`-Aufruf geprüft (202 statt 400). Abschnitt (g)
  prüft symmetrisch, dass ein real existierender, abweichender
  `kontext_pfad`/`roadmap_pfad` tatsächlich eingespeist wird (kein stiller
  Rückfall auf den Standardpfad).

## Dependencies
- F5 (Context Builder) — `baueKontextpaket`, dessen Rollenfilter/Budget-Logik
  WS-1 unverändert wiederverwendet.
- F17 (Rollenvertrag) — `ROLLENVERTRAEGE['jarvis']`/`['router']`
  (`ausschlussmuster: ['src/**']` schließt die neuen Pfade nicht aus, da sie
  außerhalb von `src/` liegen).
- F25 (Projekte v1) — `schemas/projekte.schema.json`/
  `validiereProjekteDaten`, additiv erweitert; `baueProjektHandlerMap`, das
  `projekt.kontext_pfad`/`projekt.roadmap_pfad` roh an
  `erzeugeRequestHandler` durchreicht (`loeseProjektPfade` kennt die beiden
  Felder NICHT — sie brauchen keine Pfadarithmetik relativ zu `repoWurzel`,
  anders als `basisVerzeichnis`/`startvorlagePfad`, weil `Anfrage.pfad`
  ohnehin repo-relativ bleiben muss, Reviewer-Pass-Korrektur).
- F26 (Jarvis Chat v1) / F18 (Router v1) — die beiden Aufrufstellen in
  `scripts/leitstand-server.mjs`, an denen `baueProjektkontextAnfragen`
  eingehängt ist.
- F31 WS-3 (Jarvis ohne Projekt-Settings) — Grundlage der WS-0-Messfrage
  (`--setting-sources ''` für die Rolle `jarvis`).

## Bekannte Grenzen
- **Keine Querverweisprüfung Roadmap ↔ Feature-Akte (WS-1):**
  `roadmap.json.meilensteine[].features` nennt Feature-IDs als reine
  Strings — ob zu einer genannten ID tatsächlich eine
  `features/<id>/feature.md` existiert, wird nicht geprüft (explizites
  Nicht-Ziel dieser Iteration).
- **`kontext_pfad` ist EIN Ordnerpfad, keine zwei Einzelpfade (WS-1):**
  Innerhalb dieses Ordners werden die Dateinamen `beschreibung.md`/
  `anweisungen.md` fest angenommen (`baueProjektkontextAnfragen`) — ein
  Projekt kann den Ordner umbenennen, nicht die beiden Dateinamen
  innerhalb.
- **`ausfuehrung` bekommt keinen Projektkontext über den Context Builder
  (WS-1, bewusst):** diese Rolle läuft mit `--setting-sources 'project'`
  und liest `CLAUDE.md` selbst — eine zusätzliche Einspeisung wäre eine
  Dublette derselben Information über zwei Kanäle.
- **UI/Projektion offen (WS-2, noch nicht begonnen):** kein
  "Wo stehen wir?"-Endpunkt, keine Roadmap-Ansicht im Workboard.
- **`roadmap.json` wird zur Laufzeit nicht gegen ihr Schema geprüft
  (bewusst, D5):** die Einspeisung über den Context Builder liest die Datei
  nur als roher Text (`loeseAusfuehrungsEingabenAuf`), `validiereRoadmapDaten`
  läuft ausschließlich zur Gate-Zeit (`npm run check`). Ein schema-brüchiges
  `roadmap.json` bricht dadurch keinen Lauf, wird aber unvalidiert in den
  Prompt von `jarvis`/`router` eingespeist, bis der nächste `npm run check`
  läuft (QA-Pass-Befund, geringes Risiko).
- **`scripts/eval-router.mjs` bekommt den F33-Kontext nicht** (eigener
  `POST /api/laeufe`-Aufruf mit `anfragen: []`, QA-Pass-Befund) — die
  Router-Kalibrierung misst dadurch eine leicht andere Eingabezusammensetzung
  als ein echter Produktionslauf über `POST /api/auftraege/<id>/routen`.
  Werkzeugkonsistenz-Frage, kein Produktfehler; nicht in WS-1 nachgezogen.

## Feature Review
Noch nicht fällig — WS-2 (Projektion/UI) steht aus.
