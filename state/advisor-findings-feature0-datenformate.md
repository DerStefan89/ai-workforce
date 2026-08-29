# Advisor-Findings — Feature 0: Datenformate

Geprüfter Plan: `state/plan-v1-feature0-datenformate.md`
Rolle: `architecture-advisor`, frischer Kontext, Read/Grep/Glob, kein Schreibrecht.
Geprüft gegen: `ARCHITECTURE.md` (vollständig), `docs/adr/datenformate-kontrollzustand-und-profile.md` (ADR-0002), `docs/adr/ein-ebenen-profilmodell.md` (ADR-0004), `docs/projekt/umsetzungsplan-fassung-1.md`, `state/findings.md`, `state/gates.md`, `state/memory-map.md`, `state/tooling.md`, `scripts/check-feature.mjs`, `scripts/check-contract.mjs`, `scripts/check-rules.mjs`, `features/F0/feature.md`, `features/AF-F001/feature.md`, `docs/STATUS.md`, `package.json`, `.gitignore`, `.claude/skills/werkzeug-auswahl/SKILL.md`.

Die drei in plan-v1 Abschnitt 10 genannten Offenen Punkte gelten laut
Auftrag als entschieden (Feature-ID `features/F0/`, Volltext v0 liegt in
`features/F0/feature.md` vor, F-010-Abschlussnotation nach F-012-Muster)
und wurden dem Advisor nicht erneut zur Prüfung vorgelegt.

---

## Finding F-A — `journal.md` fehlt für Feature F0

**Evidenz-Marker:** [Fakt]

**Beschreibung:** `features/F0/` enthält nur `feature.md`, kein
`journal.md`. `features/AF-F001/feature.md` legt die Konvention selbst
fest: „jedes Feature bekommt eine eigene Akte (`features/<id>/feature.md`
+ `features/<id>/journal.md`)"; die Datei muss laut AF-F001-Nicht-Ziele
existieren. `plan-v1-feature0-datenformate.md` erwähnt `journal.md` an
keiner Stelle — weder als bereits vorhanden noch als Teil des Scopes.

**Fundstelle:** `features/F0/` (fehlend); `features/AF-F001/feature.md:26,34`

**Auswirkung:** Wird das Feld nicht vor dem Handoff-Vertrag geklärt,
bleibt `features/F0/` die erste Akte, die von der eigenen
AF-F001-Konvention abweicht — ausgerechnet in dem Feature, das direkt
auf AF-F001 aufsetzt.

**Empfehlung:** `journal.md` vor Advisor-Freigabe ergänzen oder
ausdrücklich als SCOPE-Punkt in plan-v2 aufnehmen.

---

## Finding F-B — `npm run check`/`check:template` sind keine verschachtelten Skripte

**Evidenz-Marker:** [Fakt]

**Beschreibung:** `package.json` zeigt zwei unabhängige Skript-Strings,
kein verschachtelter Aufruf: `check` dupliziert dieselbe Skriptliste wie
`check:template` plus `lint`/`typecheck`/`test`, ruft `check:template`
aber nicht als Unterbefehl auf. plan-v1 SCOPE.5 formuliert „Eingehängt in
`npm run check:template` und damit `npm run check`" — das „und damit"
suggeriert eine Automatik, die strukturell nicht existiert.
`check-datenformate.mjs` muss von Hand in beide Skript-Strings
eingetragen werden.

**Fundstelle:** `package.json:15-16`; `state/plan-v1-feature0-datenformate.md`
SCOPE Punkt 5

**Auswirkung:** [Schlussfolgerung, entlastend] Bereits durch A6/A7 als
getrennte Akzeptanzkriterien abgesichert — ein vergessener zweiter
Eintrag fiele beim A7-Lauf auf, bliebe also nicht unbemerkt. Die
Plan-Formulierung selbst sollte trotzdem korrigiert werden, damit die
Ausführungsrolle nicht von einer falschen Automatik ausgeht.

**Empfehlung:** In plan-v2 SCOPE.5 präzisieren: beide Skript-Strings in
`package.json` einzeln ergänzen.

---

## Finding F-C — `additionalProperties: true` auf der Kontrollzustand-Hülle macht AC5 schema-seitig nicht durchsetzbar

**Evidenz-Marker:** [Schlussfolgerung]

**Beschreibung:** `features/F0/feature.md` Akzeptanzkriterium: „Ein
Kontrollzustand enthält keine Kopie der Inhalte des referenzierten
Projektprofils." plan-v1 SCOPE.2 legt für die Hülle
`additionalProperties: true` auf oberster Ebene fest, begründet mit
künftigen Payload-Feldern. Damit könnte ein künftiger
Kontrollzustand-Datensatz beliebige Zusatzfelder — einschließlich einer
vollständigen Profilkopie — tragen, ohne dass `check-datenformate.mjs`
das als Schemaverletzung erkennt. Das AC „keine Kopie" wird faktisch zu
einer Prozess-/Review-Regel, nicht zu einem maschinell geprüften Gate —
im Spannungsverhältnis zur eigenen Zielsetzung des Features
(„maschinell geprüft, nicht nur in Prosa beschrieben", plan-v1 A13).

**Fundstelle:** `state/plan-v1-feature0-datenformate.md` SCOPE Punkt 2;
`features/F0/feature.md` Akzeptanzkriterien

**Auswirkung:** Gering für Feature 0 selbst (noch keine realen
Unterarten), aber ein späteres Feature könnte sich fälschlich auf ein
bestehendes Gate verlassen, das diesen Fall nicht abdeckt.

**Empfehlung:** In plan-v2 explizit festhalten, dass AC „keine Kopie"
durch Schema-Design (schlanke Hülle + Review) und nicht durch
`additionalProperties: false` erzwungen wird — als bewusste, benannte
Grenze statt stillschweigender Lücke.

---

## Finding F-D — Testabdeckung der drei Pflichtfelder in `profilReferenz` ungeklärt

**Evidenz-Marker:** [Schlussfolgerung]

**Beschreibung:** Akzeptanzkriterium in `features/F0/feature.md`: „Fehlt
im Kontrollzustand Pfad, Hash oder Version der Profilreferenz, wird der
Datensatz als ungültig erkannt" — drei getrennte Fehlerfälle. plan-v1
SCOPE.3 sieht pro Schema genau eine `*.invalid.json`-Datei vor, A5
verlangt nur den Nachweis, dass „der Rot-Fall wirklich greift" an einer
Stelle. Da D5 bewusst keinen generischen JSON-Schema-Interpreter
verwendet, sondern eine handgeschriebene Feld-/Typ-Prüfung, ist nicht
automatisch sichergestellt, dass alle drei Pflichtfeld-Prüfungen
(`pfad`, `hash`, `version`) einzeln korrekt implementiert sind — ein Bug
in genau einer der drei würde von einer einzigen Invalid-Fixture, die
z. B. nur `pfad` weglässt, nicht gefangen.

**Fundstelle:** `features/F0/feature.md` Akzeptanzkriterien;
`state/plan-v1-feature0-datenformate.md` SCOPE Punkt 3, A5, D5

**Auswirkung:** Ein Rot-Fall pro Schema kalibriert nur einen von drei
AC8-Zweigen, obwohl das Feature den Anspruch „automatisiert prüfbar für
alle drei Felder" erhebt.

**Empfehlung:** In plan-v2 entweder drei separate Invalid-Fixtures für
die Kontrollzustand-Hülle vorsehen (je eine mit fehlendem `pfad`/`hash`/
`version`) oder ein explizites Testverfahren benennen, das alle drei
Zweige des handgeschriebenen Checks kalibriert — analog zum
Rot-Fall-je-Regelverletzung-Muster in `state/gates.md`.

---

## Finding F-E — Zahlenfehler in der Selbstverifikation von plan-v1

**Evidenz-Marker:** [Fakt]

**Beschreibung:** plan-v1 Abschnitt 0 behauptet „24 Gates" in
`state/gates.md`. Die reale Gate-Tabelle enthält 14 Datenzeilen; „24"
trifft eher auf die Zeilennummer des letzten Tabelleneintrags zu als auf
die Gate-Anzahl.

**Fundstelle:** `state/plan-v1-feature0-datenformate.md` Abschnitt 0;
`state/gates.md:9-24`

**Auswirkung:** Keine auf die Design-Entscheidungen — reine
Ungenauigkeit, aber gerade in einem Abschnitt, der explizit Sorgfalt
beansprucht („real geprüft, nicht aus den Handoff-Dokumenten
übernommen").

**Empfehlung:** Zahl in plan-v2 korrigieren oder präzisieren.

---

## Finding F-F — D5 zitiert `ARCHITECTURE.md` Abschnitt 6 etwas weiter, als der Wortlaut trägt

**Evidenz-Marker:** [Schlussfolgerung]

**Beschreibung:** plan-v1 D5 formuliert: „jedes neue Werkzeug verlangt
laut `ARCHITECTURE.md` Abschnitt 6 vorher den Skill `werkzeug-auswahl`".
`ARCHITECTURE.md:71` deckt wörtlich nur „Test-Framework" und
„MCP-Werkzeug" ab, nicht jede neue npm-Dependency. [Fakt, entlastend] Die
gelebte Praxis in `state/tooling.md` (Biome, `tsc`, `gh` — reguläre
Dependencies, trotzdem über `werkzeug-auswahl` geprüft) stützt die
Schlussfolgerung von D5 (kein `ajv`) inhaltlich trotzdem — nur die
Zitierschärfe ist ungenau.

**Fundstelle:** `state/plan-v1-feature0-datenformate.md` D5;
`ARCHITECTURE.md:71`; `state/tooling.md`

**Auswirkung:** Keine auf das Ergebnis (kein `ajv` bleibt richtig),
nur auf die Begründungsschärfe.

**Empfehlung:** In plan-v2 auf die gelebte Praxis in `state/tooling.md`
statt auf eine zu breite Lesart von Abschnitt 6 stützen.

---

## Finding F-G — Typ des `version`-Felds ist eine unbelegte, aber offen benannte Festlegung

**Evidenz-Marker:** [Annahme, transparent gemacht]

**Beschreibung:** Weder ADR-0002 noch die geprüften Stellen aus
`docs/projekt/zielfassung.md` legen den Datentyp von „Version" für
`profiles/` fest. plan-v1 wählt `integer, minimum: 1` als eigene
Festlegung. [Fakt, entlastend] Der Plan benennt diese Interpretation
selbst ausdrücklich als Auslegung, nicht als wörtliche Ausnahme — genau
das erwartete Verhalten, kein verstecktes Risiko.

**Fundstelle:** `state/plan-v1-feature0-datenformate.md` D1

**Auswirkung:** Keine Blockade nötig.

**Empfehlung:** In plan-v2 stehen lassen, ggf. mit Hinweis, dass eine
künftige Monotonie-Prüfung eine Historie braucht, die Feature 0 nicht
liefert (bereits so benannt).

---

## Entlastende Befunde

**[Fakt, entlastend]** Alle vier zitierten ADR-/`ARCHITECTURE.md`-Stellen
(`ARCHITECTURE.md:27-28, 39-40`, ADR-0002, ADR-0004) sind wortgetreu und
mit korrekten Zeilennummern zitiert — keine Erfindung, keine Verzerrung
gefunden.

**[Fakt, entlastend]** D2 (Scope-Grenze) deckt sich wörtlich mit den
Nicht-Zielen in `features/F0/feature.md` — Checkpoint Store,
Ausführungslogik, Web-UI, Vererbung/Overlays und Profilkopien sind in
beiden Dokumenten identisch ausgeschlossen.

**[Fakt, entlastend]** D3s Beleg zu `docs/examples/` (ein Eintrag,
`design-guardian.example.md`) ist bestätigt korrekt — kein
Namenskonflikt mit `schemas/examples/`.

**[Fakt, entlastend]** `.gitignore` enthält keinen Eintrag, der mit
`schemas/` oder `schemas/examples/` kollidiert — A7s Annahme trägt.

**[Fakt, entlastend]** Das vorgeschlagene Gate-Muster
(`scripts/check-datenformate.mjs`, Node-only, kein Framework) ist
strukturell identisch mit den drei bestehenden Gate-Skripten
(`check-feature.mjs`, `check-contract.mjs`, `check-rules.mjs`) —
Exit-Code-Konvention, Ausgabeformat und Leer-Fall-Behandlung passen zum
etablierten Muster.

**[Fakt, entlastend]** `features/F0/feature.md` erfüllt die vier von
`check-feature.mjs` bei `Status: READY_FOR_TECH` verlangten
Pflichtabschnitte (Ziel, Nicht-Ziele, Akzeptanzkriterien, Dependencies)
— das Gate würde diese Akte grün durchlassen.

**[Fakt, entlastend]** Die Akzeptanzkriterien in `features/F0/feature.md`
und plan-v1 Abschnitt 7 (A1–A13) sind inhaltlich deckungsgleich bis auf
die in F-C/F-D benannten Feinheiten — keine grobe Abweichung, keine
widersprüchliche Festlegung gefunden.

**[Fakt, entlastend]** Die verzögerte Eintragung in `state/gates.md`
erst nach dem realen Bau-/Prüflauf entspricht exakt dem im
Kalibrierungs-Log gelebten Muster.

**[Fakt, entlastend]** Die Rework-Regel (ein Baudurchgang plus höchstens
eine Korrekturrunde, zweites Rot ⇒ BLOCKIERT ⇒ Mensch) entspricht
wörtlich der Zuschnitt-Heuristik aus `CLAUDE.md`.

---

## Gesamturteil

**FREIGEGEBEN MIT HINWEISEN**

Begründung: Die vier übernommenen Empfehlungen (D1–D4) und die
eigenständige Entscheidung D5 sind gegen den realen Repo-Stand
tragfähig, sauber gegen ADR-0002/ADR-0004/`ARCHITECTURE.md` abgeglichen
und überwiegend korrekt zitiert. Kein Verstoß gegen ein
`ERZWUNGEN`-Muster, keine unbegründete neue Dependency, keine Kollision
mit einem Nicht-Ziel. Kein Finding ist blockierend im Sinne eines
Architekturbruchs.

**Vor dem Handoff-Vertrag zu klären** (in plan-v2 einfließen lassen,
keine erneute Advisor-Runde nötig, wenn schriftlich aufgenommen):
- F-A (`journal.md`-Lücke) — schließen oder bewusst als Folgeschritt
  benennen.
- F-B (`check`/`check:template` nicht verschachtelt) — Formulierung
  korrigieren.
- F-C (`additionalProperties: true` vs. AC „keine Kopie") — als bewusste,
  benannte Grenze dokumentieren.
- F-D (Testabdeckung der drei `profilReferenz`-Pflichtfelder) —
  Fixture-Anzahl oder Testverfahren präzisieren.

**Dürfen unverändert mitlaufen** (kosmetisch, keine Wirkung auf Design
oder Gate-Verhalten):
- F-E (Zahlenfehler „24 Gates").
- F-F (leicht zu weite Zitierung von `ARCHITECTURE.md` Abschnitt 6 —
  Ergebnis bleibt richtig).
- F-G (Version-Typ-Annahme — bereits transparent gemacht).

## Nächster sinnvoller Schritt

`plan-v2-feature0-datenformate.md` erstellen: F-A und F-B als Korrektur
übernehmen, F-C und F-D als explizit benannte Entscheidungen/
Testauflagen ergänzen, F-E/F-F/F-G optional richtigstellen. Danach
Handoff-Vertrag `state/tasks/feature0-datenformate.md` schreiben.
