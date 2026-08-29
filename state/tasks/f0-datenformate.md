SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: Repo DerStefan89/ai-workforce, main oder ein von main
abgeleiteter Feature-Branch (vor Ausführung mit Stefan bestätigen).

## TASK: f0-datenformate

GOAL: `kontrollzustand/` und `profiles/` existieren real im Repo (nicht
nur in `ARCHITECTURE.md` behauptet), ihr Format ist über zwei JSON-Schemas
maschinell geprüft (`scripts/check-datenformate.mjs`, eingehängt in
`npm run check` und `npm run check:template`), und `F-010` in
`state/findings.md` ist danach tatsächlich erledigt. Die
Akzeptanzkriterien A1–A13 aus `state/plan-v2-feature0-datenformate.md`
(plan-v1 + Delta 1–4) sind erfüllt.

CONTEXT:
- [Fakt] Vollständiger Plan: `state/plan-v2-feature0-datenformate.md`
  (Delta zu `state/plan-v1-feature0-datenformate.md`, der unverändert
  stehen bleibt und für alle nicht in plan-v2 erwähnten Abschnitte
  weiterhin gilt — SCOPE 1, 4, 6–9, NICHT, D1–D5, Rollen, Budget). Dieser
  Vertrag ist eine Ausführungsanweisung dazu; bei Widerspruch gilt
  plan-v2, bei dessen Schweigen plan-v1.
- [Fakt] Advisor-Urteil zu plan-v1: FREIGEGEBEN MIT HINWEISEN, siehe
  `state/advisor-findings-feature0-datenformate.md`. F-A bis F-D sind in
  plan-v2 aufgelöst (kein erneuter Advisor-Pass nötig). F-E/F-F/F-G sind
  nicht blockierend, mit vollem Wortlaut als `F-017`/`F-018`/`F-019` in
  `state/findings.md` aufgenommen — keine Aktion in diesem Vertrag nötig.
- [Fakt] Feature-Akte: `features/F0/feature.md`, `Status: READY_FOR_TECH`.
  Ziel/Scope/Nicht-Ziele/Akzeptanzkriterien dort sind die Produktsicht;
  plan-v2 §Delta ist die technische Ausprägung. Bei Widerspruch gilt
  `features/F0/feature.md` für WAS, plan-v2 für WIE.
- [Fakt] Referenzmuster für das Gate-Skript: `scripts/check-feature.mjs`
  und `scripts/check-contract.mjs` (Verzeichnis-/Dateiiteration,
  `existsSync`-Check, Exit 0 bei leerem/fehlendem Verzeichnis mit eigener
  Meldung, `befunde`-Array + Exit 1 bei Funden). Kein generischer
  JSON-Schema-Validator (`ajv` o. ä.) als neue Dependency — plan-v1 D5:
  handgeschriebene Pflichtfeld-/Typ-Prüfung genügt für zwei Schemas mit
  wenigen Beispielen; die Schema-Dateien selbst bleiben trotzdem
  standardkonformes JSON Schema Draft 2020-12.
- [Fakt] Kontrollzustand-Hülle, exakte Allowlist (Delta 3, ersetzt
  plan-v1 SCOPE.2, `additionalProperties: false`): `schema_version`
  (Pflicht), `typ` (Pflicht, String), `profil_referenz` (Pflicht, Objekt
  mit `additionalProperties: false`, Pflichtfelder `pfad`, `hash`,
  `version`), `payload` (optional, ein offener Schlüssel beliebigen
  Inhalts, Binnenaufbau Nicht-Ziel). Feldnamen sind snake_case, nicht
  camelCase — bewusste Abweichung von plan-v1s ursprünglichem
  `profilReferenz`/`erzeugtAm`, siehe plan-v2 Delta 3 Punkt 1.
  `erzeugtAm` (Zeitstempel) entfällt ersatzlos; nicht stillschweigend
  wiederherstellen.
- [Fakt] Bekannte, benannte Restlücke (plan-v2 Delta 3 Punkt 2):
  `additionalProperties: false` verhindert eine Profilkopie als
  Geschwister-Feld auf oberster Ebene, aber nicht innerhalb eines
  künftigen `payload`-Inhalts. Für Feature 0 ohne reales `payload` ist
  das hinnehmbar — im Bericht als weiterhin offene, kleinere Grenze
  nennen, nicht als vollständig geschlossen darstellen.
- [Fakt] Drei getrennte Invalid-Fixtures für die Profil-Referenz (Delta
  4, ersetzt plan-v1 SCOPE.3 für `kontrollzustand`):
  `kontrollzustand.invalid-fehlender-pfad.json`,
  `-fehlender-hash.json`, `-fehlende-version.json` — je genau ein
  Pflichtfeld der `profil_referenz` weglassen, alle anderen Pflichtfelder
  vollständig lassen. `profile.schema.json` behält ein einzelnes
  Invalid-Beispiel (kein Mehrfach-Fehlerfall im Feature-AC).
- [Fakt] `package.json` `check` und `check:template` sind zwei
  unabhängige Skript-Strings, kein verschachtelter Aufruf (Delta 2) —
  `check-datenformate.mjs` einzeln in beide eintragen.
- [Fakt] `state/memory-map.md` weist `specs/` als alleinige Heimat für
  Spec-Artefakte aus, nicht `features/<id>/` — dieselbe Korrektur wurde
  bereits für AF-F001 vollzogen (`state/tasks/af-f001-feature-akte.md`
  CONTEXT). `specs/F0/spec.md` entsteht dort, nicht unter `features/F0/`.
- [Fakt] Gültige `Status`-Werte laut `docs/projekt/zielfassung.md` §6:
  `ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT,
  FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN`.
- [Fakt] `state/findings.md` F-010 (Zeile ~81): `TECH_DEBT`, P4, aktuell
  `offen`. Abschlussnotation folgt dem F-012-Muster (Status-Feld
  `· offen` → `· gelöst`, Maßnahme-Zeile ergänzt statt Eintrag zu löschen).

SCOPE:
1. `schemas/profile.schema.json` — JSON-Schema (Draft 2020-12) für den
   Inhalt einer `profiles/*.json`-Datei, Ein-Ebenen-Modell (ADR-0004).
   Pflichtfelder oberster Ebene: `projekt`, `version` (integer,
   minimum 1 — plan-v1 D1, Version ≠ Hash), `gates`, `dod`, `werkzeuge`,
   `reviewRegeln`. Nur die vier Container als Pflichtfelder, kein
   Binnenschema (plan-v1 NICHT).
2. `schemas/kontrollzustand.schema.json` — Hülle exakt nach der Allowlist
   aus CONTEXT (`schema_version`, `typ`, `profil_referenz{pfad,hash,
   version}`, optional `payload`), `additionalProperties: false` auf
   beiden betroffenen Ebenen (Hülle und `profil_referenz`).
3. `schemas/examples/`:
   - `profile.valid.json`, `profile.invalid.json`
   - `kontrollzustand.valid.json`
   - `kontrollzustand.invalid-fehlender-pfad.json`
   - `kontrollzustand.invalid-fehlender-hash.json`
   - `kontrollzustand.invalid-fehlende-version.json`
4. `profiles/.gitkeep`, `kontrollzustand/.gitkeep` — Ordner entstehen
   jetzt (schließt F-010), bleiben leer bis zum ersten echten Gebrauch.
5. `scripts/check-datenformate.mjs` — ein Skript für beide Schemas, Muster
   wie `check-feature.mjs`/`check-contract.mjs`. Prüft: (a) beide
   Schema-Dateien sind gültiges JSON; (b) jedes `*.valid.json` erfüllt
   sein Schema; (c) jedes `*.invalid*.json` verletzt sein Schema und das
   Skript benennt die verletzte Regel; (d) jede reale Datei unter
   `profiles/*.json` bzw. `kontrollzustand/*.json`/`*.jsonl` (sobald
   vorhanden) wird ebenfalls geprüft, leere Ordner ⇒ „0 Dateien geprüft",
   kein Fehler.
6. `package.json` — `check-datenformate.mjs` einzeln in `check` UND in
   `check:template` eintragen (Delta 2, nicht nur einen Skript-String
   annehmen).
7. `state/gates.md` — neue Tabellenzeile für `check-datenformate.mjs`,
   Rot-Fall = die `*.invalid*.json`-Beispiele (alle vier, nicht nur
   eines), Grün-Fall = die `*.valid.json`-Beispiele, mit echtem
   Befehl+Ausgabe-Beleg aus dieser Sitzung — erst nach dem realen
   Bau-/Prüflauf eintragen, kein Platzhalter.
8. `state/memory-map.md` — Zeile „Datenformat-Schema (JSON Schema für
   `profiles/`/`kontrollzustand/`)" → `schemas/*.schema.json` +
   `schemas/examples/`, „nicht hierhin": nicht direkt unter
   `profiles/`/`kontrollzustand/`.
9. `docs/STATUS.md` — Eintrag unter „Erledigt": Datenformate umgesetzt.
10. `state/findings.md` — F-010 auf `· gelöst` setzen (F-012-Muster: Status
    im Kopf ändern, Maßnahme-Zeile ergänzen, Eintrag nicht löschen).
11. `ARCHITECTURE.md` Abschnitt 1 — eine Zeile für `schemas/` ergänzen.
12. `features/F0/journal.md` anlegen (Muster:
    `features/AF-F001/journal.md`), Nachträge für Coach-Feature-Akte v0,
    Challenge, plan-v1, Advisor-Pass, plan-v2, dieser Vertrag.
13. `specs/F0/spec.md` mit dem Skill `spec-schreiben` anlegen (Ablageort
    `specs/F0/`, nicht `features/F0/` — CONTEXT).

NICHT:
- Checkpoint Store, Artifact Registry, Lineage-Mechanik, Autorisierungs-
  oder Freigabelogik, jede Ausführungslogik, Execution Controller,
  Web-UI/Leitstand — eigene, spätere Features.
- Schemas für Checkpoint-, Wirkungsmarken-, Lineage- oder Transportpaket-
  **Payload** — nur die Hülle plus Profil-Referenz gehört zu Feature 0.
- Produktcode unter `src/`.
- `ajv` oder ein anderer generischer JSON-Schema-Validator als neue
  Dependency (plan-v1 D5).
- Detaillierte Binnenstruktur von `gates`/`dod`/`werkzeuge`/
  `reviewRegeln` innerhalb des Profils.
- Monotonie-Prüfung für `profiles/*.json` `version` — bräuchte eine
  Historie, die Feature 0 nicht liefert (plan-v1 D1, benannt).
- Schließen der `payload`-Restlücke aus Delta 3 Punkt 2 — bleibt Sache
  eines späteren Features.

BUDGET: Ein Baudurchgang plus höchstens eine Korrekturrunde. Zweites Rot
auf demselben Gate ⇒ BLOCKIERT ⇒ Mensch.

OUTPUT:
- Neue Dateien: `schemas/profile.schema.json`,
  `schemas/kontrollzustand.schema.json`, `schemas/examples/*` (6 Dateien
  laut SCOPE.3), `profiles/.gitkeep`, `kontrollzustand/.gitkeep`,
  `scripts/check-datenformate.mjs`, `features/F0/journal.md`,
  `specs/F0/spec.md`.
- Geänderte Dateien: `package.json` (`check` und `check:template`),
  `state/gates.md`, `state/memory-map.md`, `docs/STATUS.md`,
  `state/findings.md` (F-010), `ARCHITECTURE.md` Abschnitt 1.
- Beleg: `npm run check:template` und `npm run check` grün, Konsolen-
  Ausgabe im Bericht zeigen. Kalibrierungstest: für jedes der vier
  Invalid-Beispiele (inkl. aller drei `profil_referenz`-Varianten) und
  für `profile.invalid.json` je einen echten Rot-Fall zeigen (Exit-Code +
  benannte Regelverletzung), danach den Grün-Zustand wiederherstellen.
- Commit ausschließlich mit expliziten Pfaden (nie `-A`/`.`), `git-flow`-
  Skill nutzen, kein Commit ohne frische `state/freigabe-commit.md`,
  Push separat autorisiert.
- Bericht: was geändert wurde, welche Checks liefen, Ergebnis, die
  benannte `payload`-Restlücke (Delta 3 Punkt 2) als weiterhin offen
  bestätigen, echte Blocker.

ESCALATE:
- `state/plan-v2-feature0-datenformate.md` fehlt oder widerspricht
  diesem Vertrag → abbrechen, melden, nichts anlegen.
- Der Kalibrierungstest für einen der vier Rot-Fälle reproduziert sich
  nicht wie erwartet → anhalten, welchen Fall betrifft es, was
  tatsächlich passierte, melden. Nicht das Skript so lange anpassen, bis
  irgendein Fehler auftritt.
- `npm run check` wird rot an einem Glied, das dieser Auftrag nicht
  angefasst hat → anhalten und melden. Kein Nachziehen fremder Stellen.
- Eine der vorgegebenen Formulierungen (SCOPE/AK, insbesondere die
  Allowlist-Feldnamen aus Delta 3) widerspricht
  `features/F0/feature.md` oder `docs/projekt/zielfassung.md` → anhalten,
  beide Stellen zitieren, melden. Nicht selbst entscheiden, welche gilt.
- `git commit` oder `git push` wird ohne frische Freigabedatei verlangt
  → nicht ausführen.

Vertrag endet mit Freigabe-Halt: kein Bau, kein Commit, kein Push in
diesem Schritt. Ausführung erst nach Stefans expliziter Freigabe.
