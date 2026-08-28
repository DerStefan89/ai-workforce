# Spec: AF-F001 — Feature-Akte im Repo

## Problem & Nutzer

`[Fakt]` `features/` existiert im Repo nicht (Glob `features/**` liefert
keine Treffer). `specs/` existiert nur mit `.gitkeep`. Es gibt keine
Ablage, aus der eine frische Claude-Code-Sitzung — ohne Zugriff auf den
Claude-Projektchat — lesen kann, was ein Feature ist, was ausdrücklich
nicht dazugehört und woran Fertigkeit erkannt wird.

`[Fakt]` `state/memory-map.md:23` weist `specs/` bereits als alleinige
Heimat für Spec-Inhalte aus ("das WAS eines Vorhabens"). Es fehlt die
entsprechende Zeile für die Feature-Akte selbst (Status, Dependencies,
Workstreams — mehr als eine Spec trägt).

`[Fakt]` `scripts/check-contract.mjs` (Zeile 26-38) zeigt das im Projekt
etablierte Gate-Muster: Verzeichnis-Iteration, `existsSync`-Check, Exit 0
bei fehlendem/leerem Verzeichnis mit je eigener Meldung. Für Feature-Akten
existiert kein Äquivalent.

Nutzer: die nächste Claude-Code-Sitzung (Executor-Rolle), die an einem
Feature weiterarbeitet, sowie Stefan als einzige Freigabeinstanz.

## Entschieden (vor dem Plan geklärt)

- **Ablageort Feature-Akte:** `features/<feature-id>/feature.md` +
  `features/<feature-id>/journal.md`. Begründung: die Akte trägt mehr als
  eine Spec (Status, Dependencies, Workstream-Liste) — `specs/` bleibt auf
  "das WAS" begrenzt (`state/memory-map.md`, `docs/guide/06-DER-PROZESS.md:52`).
- **`spec.md` bleibt in `specs/<feature-id>/`.** Zieht nicht nach
  `features/<id>/` um. `feature.md` referenziert den Pfad, kopiert ihn
  nicht (keine zweite Autorität für denselben Inhalt).
- **Gate-Umfang für `Status: READY_FOR_TECH`:** geprüft werden genau vier
  Pflichtabschnitte — Ziel, Nicht-Ziele, Akzeptanzkriterien, Dependencies.
  Workstream-Liste, Entscheidungs-Referenzen und Zuordnung sind
  Pflichtfelder der Akte, aber nicht Teil des automatisierten Gates in
  dieser ersten Fassung (YAGNI — Erweiterung erst bei belegtem Bedarf).
- **Gate-Muster:** analog `scripts/check-contract.mjs` — Verzeichnis-
  Iteration über `features/`, `existsSync`-Check, Exit 0 mit eigener
  Meldung bei fehlendem oder leerem Verzeichnis.
- **Gültige `Status`-Werte:** `ENTWURF, READY_FOR_TECH,
  WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
  BLOCKIERT, ABGEBROCHEN`. Ein Wert außerhalb dieser Menge oder ein
  fehlendes `Status:`-Feld gilt als Fehler, unabhängig vom Status-Wert
  selbst (die vier Pflichtabschnitte werden nur bei `READY_FOR_TECH`
  geprüft, das Status-Feld selbst immer).

## Gewünschtes Verhalten

- **V1** Existiert `features/<id>/feature.md` mit `Status: READY_FOR_TECH`
  und sind Ziel, Nicht-Ziele, Akzeptanzkriterien und Dependencies als
  Markdown-Überschriften vorhanden, liefert
  `node scripts/check-feature.mjs` Exit 0.
- **V2** Fehlt bei `Status: READY_FOR_TECH` der Ziel-Abschnitt, liefert
  das Gate Exit 1 mit einer Meldung, die den fehlenden Abschnitt benennt.
- **V3** Fehlt bei `Status: READY_FOR_TECH` der Nicht-Ziele-Abschnitt,
  liefert das Gate Exit 1 mit einer Meldung, die den fehlenden Abschnitt
  benennt.
- **V4** Fehlt bei `Status: READY_FOR_TECH` der
  Akzeptanzkriterien-Abschnitt, liefert das Gate Exit 1 mit einer
  Meldung, die den fehlenden Abschnitt benennt.
- **V5** Fehlt bei `Status: READY_FOR_TECH` der Dependencies-Abschnitt,
  liefert das Gate Exit 1 mit einer Meldung, die den fehlenden Abschnitt
  benennt.
- **V6** Fehlt das `Status:`-Feld ganz oder steht dort ein Wert außerhalb
  der in "Entschieden" genannten Menge, liefert das Gate Exit 1 mit der
  Meldung "Status fehlt oder unbekannt".
- **V7** `[Bestandsverhalten, analog check-contract.mjs]` Existiert
  `features/` nicht, liefert das Gate Exit 0 mit der Meldung "ⓘ kein
  Feature-Verzeichnis, nichts zu prüfen".
- **V8** `[Bestandsverhalten, analog check-contract.mjs]` Existiert
  `features/`, ist aber leer, liefert das Gate Exit 0 mit der Meldung
  "ⓘ 0 Akten geprüft".
- **V9** `npm run check:template` ruft `scripts/check-feature.mjs` auf.
- **V10** `state/memory-map.md` enthält eine Zeile "Feature-Akte →
  `features/<id>/feature.md`" mit einer "nicht hierhin"-Spalte, die
  `specs/` und `state/tasks/` als falsche Ablageorte ausschließt.

## Nicht-Ziele

- Execution Controller/Orchestrator, Checkpoint Store, Artifact Registry,
  Human Transport, Leitstand, ChatGPT-API-Anbindung, automatischer
  Rollenaufruf — eigene, spätere Features, nicht Teil der Feature-Akte-
  Konvention selbst.
- Automatisierte Prüfung von Workstream-Liste, Entscheidungs-Referenzen
  und Zuordnung im Gate — Pflichtfelder der Akte, aber YAGNI für das
  Gate in dieser ersten Fassung; Erweiterung erst bei belegtem Bedarf.
- Automatisierte Prüfung von `journal.md`-Inhalt oder -Format — die
  Datei muss existieren, ihr Inhalt ist Anhängeprotokoll, kein Gate-Ziel.
- Änderungen an `commit-guard.cjs`, `guard-settings.js` oder Reparatur
  des dortigen `cwd`-Fehlers — eigener Vertrag, andere Vertrauensgrenze.
- Änderungen an `ARCHITECTURE.md`, `CLAUDE.md`, `docs/adr/*` — bereits
  erledigt, nicht Teil dieses Vorhabens.
- Migration des Entscheidungsregisters 001–176 — eigener Task.

## Constraints

- Nur `node:fs`/`node:path` aus der Standardbibliothek, keine neue
  Abhängigkeit (Stack-Regel `CLAUDE.md`).
- Gate-Skript folgt dem Muster von `scripts/check-contract.mjs`
  (Struktur, Meldungsformat, Exit-Code-Konvention).
- Budget: ein Baudurchgang plus höchstens eine Korrekturrunde
  (`state/plan-v2-af-f001-feature-akte.md` §5).

## Offene Fragen

- Ob `journal.md` künftig ein eigenes Pflichtformat bekommt (Zeitstempel,
  Pass-Typ als Spalten) oder Freitext bleibt — hier bewusst offen
  gelassen, da kein automatisiertes Gate darauf geprüft wird.
- Ob die vier automatisierten Pflichtabschnitte über exakte
  Überschriftstexte (z. B. `## Nicht-Ziele`) oder über tolerantere
  Muster (Groß-/Kleinschreibung, Synonyme) erkannt werden — Entscheidung
  liegt beim Bauschritt, sofern sie nicht bereits durch das
  `check-contract.mjs`-Muster vorgegeben ist.
