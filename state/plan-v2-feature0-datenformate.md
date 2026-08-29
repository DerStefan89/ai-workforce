# Plan v2 — Feature 0: Datenformate

Slug: feature0-datenformate
Stand: 2026-08-29
Grundlage: `state/plan-v1-feature0-datenformate.md` (bleibt unverändert
stehen, wird hier nicht überschrieben) plus Advisor-Urteil
`state/advisor-findings-feature0-datenformate.md`: **FREIGEGEBEN MIT
HINWEISEN**.

Dieses Dokument trägt nur die vier zu klärenden Findings (F-A–F-D) als
Delta zu plan-v1. Alle Abschnitte von plan-v1, die hier nicht erwähnt
werden, gelten unverändert fort (SCOPE 1, 4–9, NICHT, D1–D5,
Akzeptanzkriterien, Rollen, Budget).

F-E/F-F/F-G gelten als nicht blockierend (kosmetisch bzw. bereits
transparent gemacht) und bleiben unverändert — sie wurden mit vollem
Wortlaut als `F-017`/`F-018`/`F-019` in `state/findings.md` aufgenommen,
kein Recheck nötig.

---

## Delta 1 (löst F-A) — `journal.md` und `spec.md` werden Teil des Scopes

plan-v1 SCOPE erhält zwei zusätzliche Punkte:

**SCOPE.10 (neu):** `features/F0/journal.md` anlegen (Anhängeprotokoll,
Muster: `features/AF-F001/journal.md`). Erster Eintrag: „Akte angelegt,
Handoff-Vertrag f0-datenformate ausgeführt" plus knappe Nachträge für
die bisherigen Schritte (Product-Coach-Feature-Akte v0, Challenge
`77_CHALLENGE`, plan-v1, Advisor-Pass) — retroaktiv, damit `features/F0/`
nicht als erste Akte von der eigenen AF-F001-Konvention abweicht.

Begründung: `features/AF-F001/feature.md` legt `journal.md` als
Pflichtbestandteil jeder Feature-Akte fest; F0 baut direkt auf AF-F001
auf, eine Ausnahme wäre unbegründet.

**SCOPE.11 (neu):** `specs/F0/spec.md` mit dem Skill `spec-schreiben`
anlegen (Problem, V-Aussagen, Nicht-Ziele, Constraints, offene Fragen —
Inhalt: der Datenvertrag für `profiles/`/`kontrollzustand/` selbst).
**Ablageort:** `specs/F0/spec.md`, nicht `features/F0/spec.md` —
`state/memory-map.md` weist `specs/` als alleinige Heimat für
Spec-Artefakte aus, exakt dieselbe Korrektur wurde bereits für AF-F001
selbst vollzogen (`state/tasks/af-f001-feature-akte.md` CONTEXT). Löst
den dritten Teil von F-A (vollständiges Drei-Artefakte-Set:
`feature.md` + `spec.md` + `journal.md`), ohne die einmal korrigierte
Ablagekonvention erneut zu brechen.

## Delta 2 (löst F-B) — SCOPE.5-Formulierung präzisiert

plan-v1 SCOPE.5 sagt: „Eingehängt in `npm run check:template` und damit
`npm run check`." Das ist präzisiert, nicht inhaltlich geändert:

**SCOPE.5 (Präzisierung):** `package.json` enthält zwei unabhängige
Skript-Strings (`check` und `check:template`), keinen verschachtelten
Aufruf — `check` dupliziert die Kette von `check:template` und ergänzt
`lint`/`typecheck`/`test`. `check-datenformate.mjs` muss **einzeln in
beide** Skript-Strings eingetragen werden, nicht nur in einen mit der
Annahme, der andere folge automatisch. A6/A7 bleiben getrennte
Akzeptanzkriterien und fangen einen vergessenen zweiten Eintrag ohnehin
ab — die Korrektur betrifft nur die Ausführungsanweisung, nicht das
Sicherheitsnetz.

## Delta 3 (löst F-C) — Kontrollzustand-Hülle: `additionalProperties: false` mit Allowlist

plan-v1 SCOPE.2 legte für die Kontrollzustand-Hülle
`additionalProperties: true` fest (Pflichtfelder `typ`, `erzeugtAm`,
`profilReferenz`). Das wird ersetzt, nicht nur kommentiert — Stefans
explizite Entscheidung macht AC „keine Kopie" strukturell gate-geprüft
statt Konvention:

**SCOPE.2 (ersetzt):** Kontrollzustand-Hülle mit
`additionalProperties: false` auf oberster Ebene, feste Schlüssel-
Allowlist:
- `schema_version` (Pflicht)
- `typ` (Pflicht, String)
- `profil_referenz` (Pflicht, Objekt mit `additionalProperties: false`,
  Pflichtfelder `pfad`, `hash`, `version` — siehe ADR-0002)
- `payload` (optional, ein einzelner offener Schlüssel beliebigen
  Objekt-Inhalts) — Erweiterungspunkt für künftige Unterarten
  (Checkpoint, Wirkungsmarke, Lineage, Transportpaket), die eigene
  Payload-Schemas mitbringen, ohne die Hülle selbst zu ändern. Der
  Binnenaufbau von `payload` bleibt Nicht-Ziel dieses Features (siehe
  plan-v1 Abschnitt 3, unverändert).

**Zwei offene Punkte aus dieser Entscheidung, nicht stillschweigend
geglättet:**
1. **Feldnamen geändert:** Stefans Vorgabe nennt `schema_version` und
   `profil_referenz` (snake_case) statt plan-v1s `erzeugtAm`/
   `profilReferenz` (camelCase) — `erzeugtAm` (Zeitstempel) entfällt
   ersatzlos aus der Allowlist, `schema_version` ist neu. Übernommen wie
   vorgegeben; falls `erzeugtAm` doch gebraucht wird (z. B. für eine
   künftige Lineage-Prüfung), ist das ein separater, bewusster
   Nachtrag, keine stillschweigende Wiederherstellung im Executor-Schritt.
2. **`payload` schließt die Lücke nicht vollständig:** ein Profilkopie
   könnte weiterhin *innerhalb* von `payload` landen — die Allowlist
   verhindert nur Profilkopien als Geschwister-Feld auf oberster Ebene.
   Für Feature 0 (kein reales `payload` im Umlauf, Nicht-Ziel:
   Unterarten-Schemas) ist das eine schmalere, benannte Restlücke als in
   plan-v1, kein vollständig geschlossenes Gate.

**A13, ergänzt (aus Delta 3):** `kontrollzustand/` und `profiles/`
existieren im Repo (nicht nur in `ARCHITECTURE.md` behauptet), ihr
erwartetes Format ist maschinell geprüft — **einschließlich AC „keine
Profilkopie als Geschwister-Feld"**, jetzt strukturell durch
`additionalProperties: false` erzwungen. Die schmalere Restlücke
(Profilkopie innerhalb eines künftigen `payload`-Inhalts) bleibt Sache
eines späteren Features, das `payload` erstmals real befüllt — hier
benannt, nicht verschwiegen.

## Delta 4 (löst F-D) — drei Negativbeispiele für die Profil-Referenz

plan-v1 SCOPE.3 sah pro Schema genau ein `*.invalid.json` vor. Für die
Kontrollzustand-Hülle reicht das nicht: das AC „Fehlt im Kontrollzustand
Pfad, Hash oder Version der Profilreferenz, wird der Datensatz als
ungültig erkannt" benennt drei getrennte Fehlerfälle, und die
handgeschriebene Feld-/Typ-Prüfung (D5: kein generischer
JSON-Schema-Interpreter) kalibriert jeden Zweig nur, wenn er einzeln
geprüft wird.

**SCOPE.3 (geändert):**
- `schemas/examples/profile.valid.json`,
  `schemas/examples/profile.invalid.json` — unverändert, ein Paar genügt
  (Profil-AC kennt keine Mehrfach-Fehlerfälle).
- `schemas/examples/kontrollzustand.valid.json` — unverändert.
- `schemas/examples/kontrollzustand.invalid.json` — **entfällt als
  Einzeldatei**, ersetzt durch drei benannte Dateien:
  - `schemas/examples/kontrollzustand.invalid-fehlender-pfad.json`
  - `schemas/examples/kontrollzustand.invalid-fehlender-hash.json`
  - `schemas/examples/kontrollzustand.invalid-fehlende-version.json`

  Jede Datei lässt genau eines der drei `profil_referenz`-Pflichtfelder
  weg, alle anderen Pflichtfelder (inklusive der Hülle selbst) bleiben
  vollständig — damit jede Datei genau einen Fehlerzweig prüft, nicht
  mehrere gleichzeitig.

**A5 (geändert):** `node scripts/check-datenformate.mjs` liefert für
`profile.invalid.json` UND für alle drei
`kontrollzustand.invalid-*.json`-Dateien je Exit 1 mit benannter
Regelverletzung (welches Feld fehlt) — Nachweis, dass alle drei
Rot-Fälle der Profil-Referenz einzeln greifen, nicht nur einer davon.

**A2/A3 (Formulierung angepasst):** A3 verweist jetzt auf drei
Invalid-Beispiele statt eines; A2 bleibt für `profile.schema.json`
unverändert (ein Paar).

---

## Ergebnis

Plan v2 = plan-v1 (SCOPE 1, 4, 6–9, NICHT, D1–D2/D4–D5, A1, A4, A6–A12,
Rollen, Budget unverändert) + Delta 1–4 oben (SCOPE.2 ersetzt, SCOPE.3
geändert, SCOPE.5 präzisiert, SCOPE.10–11 neu, A2/A3/A5/A13 angepasst).
Kein neues Advisor-Pass nötig (laut Advisor-Urteil: „wenn schriftlich
aufgenommen" — hiermit erfüllt).

## Nächster Schritt

Handoff-Vertrag `state/tasks/f0-datenformate.md`, sieben Pflichtsektionen,
SCHRITT 0 wörtlich.
