# Spec: F0 — Datenformate

## Problem & Nutzer

`[Fakt]` Vor diesem Feature waren `kontrollzustand/` und `profiles/` in
`ARCHITECTURE.md` (Abschnitt 1, Zeile 27-28) im Präsens beschrieben, ohne
real im Repo zu existieren (`F-010`, `state/findings.md`). Damit gab es
keine eigenständige, maschinell prüfbare Quelle dafür, welche Angaben ein
Projektprofil oder ein Kontrollzustand tragen muss und wann ein Datensatz
als gültig gilt — nur Prosa in `ARCHITECTURE.md` und den ADRs.

`[Fakt]` ADR-0002 (`docs/adr/datenformate-kontrollzustand-und-profile.md`)
und ADR-0004 (`docs/adr/ein-ebenen-profilmodell.md`) legen die Grundsätze
bereits fest: `kontrollzustand/` hält vom Profil nur eine gepinnte
Referenz (Pfad, Hash, Version), nie eine Kopie; `profiles/` ist die
alleinige editierbare Quelle, Ein-Ebenen-Modell ohne Domänen-Profil oder
Overlay. Diese Spec macht daraus einen geprüften Datenvertrag, keine neue
Entscheidung.

Nutzer: der Kern (künftiger Checkpoint Store, Autorisierung, Ausführung),
sobald er beginnt, echte Dateien unter `profiles/`/`kontrollzustand/` zu
schreiben oder zu lesen; die nächste Claude-Code-Sitzung, die diese
Ordner erstmals real befüllt.

## Entschieden (vor dem Plan geklärt)

- **Version ≠ Hash** in der Profil-Referenz. `version` ist ein vom
  Profil-Autor gepflegtes Feld (Integer, minimum 1), `hash` bleibt die
  Integritätsprüfung des Inhalts. Begründung: `ARCHITECTURE.md:39` nennt
  „Pfad, Hash und Version" als drei getrennte Felder — wären Hash und
  Version identisch, bräuchte es nur zwei (plan-v1 D1).
- **Kontrollzustand-Hülle mit `additionalProperties: false`**, feste
  Allowlist (`schema_version`, `typ`, `profil_referenz`, optional
  `payload`), Feldnamen snake_case. Begründung: macht das
  Akzeptanzkriterium „keine Profilkopie als Geschwister-Feld" strukturell
  gate-geprüft statt nur Konvention (plan-v2 Delta 3).
- **Kein generischer JSON-Schema-Validator** (kein `ajv`). Begründung:
  zwei Schemas mit wenigen Beispielen rechtfertigen keine neue Dependency;
  handgeschriebene Pflichtfeld-/Typ-Prüfung genügt (plan-v1 D5). Die
  Schema-Dateien selbst bleiben trotzdem standardkonformes JSON Schema
  Draft 2020-12, falls ein späteres Feature einen generischen Validator
  braucht.
- **Ablageort `schemas/`**, nicht unter `profiles/`/`kontrollzustand/`
  oder `docs/`. Begründung: Schemas sind Prüfgrundlage für ein Gate, keine
  Produktivdaten und keine Prosa-Doku (plan-v1 Abschnitt 5).
- **Drei getrennte Invalid-Fixtures für `profil_referenz`** (fehlender
  Pfad/Hash/Version je eigene Datei) statt einer gemeinsamen. Begründung:
  eine handgeschriebene Prüfung ohne generischen Interpreter kalibriert
  jeden Pflichtfeld-Zweig nur, wenn er einzeln getestet wird (plan-v2
  Delta 4).

## Gewünschtes Verhalten

Bestandsverhalten — bereits gebaut und real kalibriert
(`state/gates.md`, Zeile „Datenformate-Gate"), hier als Prüfmaßstab
festgeschrieben, nicht als offene Arbeit.

**`schemas/profile.schema.json` / `profiles/*.json`**

- **V1** Ein Objekt mit den sechs Pflichtfeldern `projekt` (nicht-leerer
  String), `version` (Integer ≥ 1), `gates`, `dod`, `werkzeuge`,
  `reviewRegeln` (je Array oder Objekt) gilt als gültiges Profil.
- **V2** Fehlt eines der sechs Pflichtfelder, meldet
  `node scripts/check-datenformate.mjs` das fehlende Feld namentlich und
  liefert Exit 1.
- **V3** Der Binnenaufbau von `gates`/`dod`/`werkzeuge`/`reviewRegeln`
  wird nicht geprüft — jedes Array oder Objekt an dieser Stelle gilt als
  gültig (plan-v1 NICHT, YAGNI ohne belegten zweiten Bedarf).
- **V4** Eine Monotonie-Prüfung für `version` über mehrere Dateiversionen
  hinweg findet nicht statt — es gibt keine Historie, gegen die geprüft
  werden könnte.

**`schemas/kontrollzustand.schema.json` / `kontrollzustand/*.json`,
`*.jsonl`**

- **V5** Ein Objekt mit `schema_version` (Integer ≥ 1), `typ`
  (nicht-leerer String) und `profil_referenz` (Objekt mit `pfad`, `hash`,
  `version`, je nicht-leerer String bzw. Integer ≥ 1 für `version`) gilt
  als gültiger Kontrollzustand. `payload` ist optional und beliebigen
  Inhalts.
- **V6** Trägt der Kontrollzustand ein Feld außerhalb der Allowlist
  (`schema_version`, `typ`, `profil_referenz`, `payload`) auf oberster
  Ebene, gilt er als ungültig — das schließt strukturell aus, dass eine
  Profilkopie als Geschwister-Feld landet.
- **V7** Fehlt in `profil_referenz` `pfad`, `hash` oder `version`, gilt
  der Kontrollzustand als ungültig, und die Meldung benennt das jeweils
  fehlende Feld einzeln (`profil_referenz.pfad`/`.hash`/`.version`) —
  nicht nur „profil_referenz ungültig".
- **V8** Trägt `profil_referenz` ein Feld außerhalb von `pfad`, `hash`,
  `version`, gilt der Kontrollzustand als ungültig.
- **V9** Eine `.jsonl`-Datei wird zeilenweise geprüft — jede nicht-leere
  Zeile ist ein eigener Kontrollzustand-Datensatz mit eigenem
  Prüfergebnis.

**Gate-Mechanik**

- **V10** `node scripts/check-datenformate.mjs` prüft zusätzlich, dass
  beide Schema-Dateien selbst gültiges JSON sind, und für eine fest im
  Skript enumerierte Liste von sechs Beispieldateien unter
  `schemas/examples/`, dass jedes `*.valid.json` sein Schema erfüllt und
  jedes `*.invalid*.json` es verletzt. Kein automatisches Scannen von
  `schemas/examples/` — eine neu abgelegte, nicht in der Liste
  eingetragene Datei wird nicht automatisch mitgeprüft.
- **V11** Ist `profiles/` bzw. `kontrollzustand/` leer (nur `.gitkeep`),
  meldet das Gate „0 Dateien geprüft" und liefert Exit 0 — kein Fehler.
- **V12** `npm run check` und `npm run check:template` rufen
  `scripts/check-datenformate.mjs` unabhängig voneinander auf (zwei
  Skript-Strings, kein verschachtelter Aufruf).

## Nicht-Ziele

- Checkpoint Store, Artifact Registry, Lineage-Mechanik, Autorisierungs-
  oder Freigabelogik, jede Ausführungslogik, Execution Controller,
  Web-UI/Leitstand — eigene, spätere Features (`features/F0/feature.md`
  Nicht-Ziele).
- Schemas für Checkpoint-, Wirkungsmarken-, Lineage- oder
  Transportpaket-**Payload** — nur die Hülle plus Profil-Referenz gehört
  zu F0; künftige Unterarten bringen eigene Payload-Schemas mit, ohne die
  Hülle zu ändern.
- Schließen der Restlücke, dass eine Profilkopie innerhalb eines
  künftigen `payload`-Inhalts landen könnte — `additionalProperties:
  false` verhindert das nur auf oberster Ebene und innerhalb von
  `profil_referenz`. Bleibt Sache des Features, das `payload` erstmals
  real befüllt (plan-v2 Delta 3 Punkt 2).
- Detaillierte Binnenstruktur von `gates`/`dod`/`werkzeuge`/
  `reviewRegeln` — kein zweiter konkreter Bedarf bekannt (YAGNI).
- Generischer JSON-Schema-Validator (`ajv` o. ä.) als Dependency —
  handgeschriebene Prüfung genügt für zwei Schemas mit wenigen Beispielen
  (plan-v1 D5).
- Monotonie-Prüfung für `profiles/*.json` `version` — bräuchte eine
  Historie, die dieses Feature nicht liefert.

## Constraints

- Nur `node:fs`/`node:path` aus der Standardbibliothek, keine neue
  Abhängigkeit.
- Gate-Skript folgt dem Muster von `scripts/check-feature.mjs`/
  `scripts/check-contract.mjs` (Verzeichnis-Iteration, `existsSync`-Check,
  Exit-0-Sonderfall für leeres/fehlendes Verzeichnis, `befunde`-Array,
  Exit 1 bei Funden).
- Schema-Dateien bleiben standardkonformes JSON Schema Draft 2020-12,
  auch ohne aktiven generischen Interpreter.
- Budget: ein Baudurchgang plus höchstens eine Korrekturrunde
  (`state/tasks/f0-datenformate.md`).

## Offene Fragen

- Ob `schema_version` künftig mehr als einen möglichen Wert trägt (z. B.
  bei einer inkompatiblen Hüllenänderung) — für F0 genügt „Integer ≥ 1",
  eine Versionierungsstrategie für die Hülle selbst ist nicht Teil dieses
  Features.
- Ob ein künftiges Feature, das `payload` erstmals befüllt, eine eigene
  `additionalProperties: false`-Grenze für dessen Binnenaufbau braucht,
  um die in den Nicht-Zielen benannte Restlücke zu schließen — hier
  bewusst offen gelassen.
