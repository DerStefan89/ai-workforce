# Advisor-Pass — Plan v1 F9 "Human Transport"

**Geprüfte Datei:** `state/tasks/f9-human-transport.md`
**Kontext:** `features/F9/feature.md`, `features/F9/journal.md`, `ARCHITECTURE.md`, `docs/projekt/zielfassung.md`, `docs/projekt/umsetzungsplan-fassung-1.md`, `src/checkpoint-store/index.ts`, `src/lineage-registry/index.ts` (+ Test), `schemas/examples/kontrollzustand-lineage-kern.valid.json`, `scripts/leitstand-server.mjs`, `public/leitstand/app.js`, `state/findings.md`, `state/plan-v1-f3-authorization-boundary.md`.

Durchgeführt von einem architecture-advisor-Subagenten mit frischem Kontext, 30.08.2026.

---

## Urteil

**Freigegeben mit Hinweisen.**

Kein struktureller oder sicherheitsrelevanter Mangel gefunden. D2 und D3 sind fachlich tragfähig begründet und mit realen Repo-Stellen belegt. Es bleiben aber ein echter Fehlerpfad-Lücke (Reaktion auf `stale: true`) und ein veralteter Verweis (F-031), die vor dem Bauauftrag nachgezogen werden sollten — kein Blocker, aber auch keine reine Kosmetik.

---

## Befunde

### B1 — D3 (Zeitpunkt von `RUN_PREPARED`): Begründung geprüft, trägt

**[Fakt]** `features/F1B/feature.md` AC3: „`RUN_PREPARED` wird vor der möglichen Außenwirkung geschrieben." Plan-v1 zitiert dies fast wörtlich in Abschnitt 4, D3.
**[Fakt]** `src/checkpoint-store/index.ts:672-756` (`stelleLaufstatusFest`) behandelt eine offene `run_prepared`-Sequenz ohne Terminal generisch als `KLAERUNG_ERFORDERLICH` — unabhängig davon, ob die Außenwirkung real stattfand oder der Mensch vorher abgebrochen hat. F1B selbst testet exakt diesen Fall ("Abbruch zwischen `RUN_PREPARED` und Terminalartefakt", `feature.md` AC7) als akzeptiertes Verhalten, nicht als Sonderfall von F9.
**[Schlussfolgerung]** Die von D3 gewählte Reihenfolge (Bedarf registrieren → Transportpaket v1 registrieren → `RUN_PREPARED` → **erst dann** manuelle Aushändigung) ist korrekt: Der Moment, in dem die Kontrolle das System tatsächlich verlässt, ist die Aushändigung, nicht die Rückkehr der Antwort. Eine spätere Platzierung (z. B. erst beim Import) würde einen Lauf, bei dem der Mensch nie zurückkehrt, komplett ohne Wirkungsmarke lassen — das wäre eine echte Lücke im Sicherheitsnetz. Die interne Registrierung von Bedarf/Transportpaket **vor** `RUN_PREPARED` ist unproblematisch, weil das reine Systemschreibvorgänge sind, keine Außenwirkung.
**Fundstelle:** plan-v1 Abschnitt 4 (D3), Abschnitt 2.3 Schritte 1–4; `features/F1B/feature.md` AC3/AC7; `src/checkpoint-store/index.ts:672-756`.
**Auswirkung:** keine — D3 ist freizugeben, keine Nacharbeit nötig.
**Vorschlag:** keiner. Optional könnte plan-v2 explizit erwähnen, dass das bekannte F1B-Verhalten "Abbruch vor Terminal → `KLAERUNG_ERFORDERLICH`" hier bewusst mitgetragen (nicht neu erfunden) wird — rein dokumentarisch, kein Verhaltensänderungsbedarf.

### B2 — D2-Testauflage: im Kern erfüllt, aber nur implizit über ein AC, nicht als benannter Testfall

**[Fakt]** Abschnitt 7, **A8**: „`pruefeStale` gegen die Transportpaket-Eingaben (inkl. der `BEDARF_V0`-Referenz, D2) liefert `stale: true`, sobald die referenzierte `BEDARF_V0`-Version nicht mehr die aktuellste ist (deckt AC7)." Das ist exakt das von D2 zur Diskussion gestellte Nutzungsmuster (synthetischer, nicht-dateisystemischer `pfad`-Schlüssel).
**[Fakt]** `src/lineage-registry/lineage-registry.test.ts:144-160` ("AC14-Hauptfall") ist der einzige real existierende Test von `pruefeStale` in F2 — er nutzt zwar einen dateipfad-*förmigen* Schlüssel (`'docs/zitierte-eingabe.md'`), liest aber die "aktuellen Inhalte" (`'ABC'`/`'XYZ'`) nicht von der Platte, sondern übergibt sie als literale Test-Strings. Es gibt also **keinen** F2-eigenen Test, der `pruefeStale` gegen eine artefaktinterne Referenz (Ergebnis von `ladeArtefaktVersion`) statt gegen einen Datei-Inhalt prüft.
**[Schlussfolgerung]** Die vom Challenger verlangte Auflage — ein expliziter Testfall für dieses Nutzungsmuster in F9s eigener Test-Suite — ist durch A8 formal vorgesehen, weil A8 zwingend einen `human-transport.test.ts`-Fall braucht (Ablageort Abschnitt 5, DoD/A12/A13 verlangen `npm run check` grün). Es fehlt aber ein ausdrücklicher, benannter Testfall-Verweis (analog `AC14-Hauptfall` in F2), der genau dieses D2-Muster als eigenständigen, so benannten Testfall festschreibt, statt es nur implizit über eine allgemeine AC-Nummer laufen zu lassen.
**Fundstelle:** plan-v1 Abschnitt 7 (A8), Abschnitt 10 Punkt 1; `src/lineage-registry/lineage-registry.test.ts:144-160`.
**Auswirkung:** gering — die Auflage ist der Substanz nach erfüllt, aber ohne explizite Benennung besteht ein kleines Risiko, dass der Executor den synthetischen-Schlüssel-Testfall bei der Umsetzung nur "nebenbei" mitlaufen lässt statt bewusst als Regressionstest für D2 zu benennen.
**Vorschlag:** In plan-v2 (oder im Handoff-Vertrag) A8 um einen konkreten Testnamen ergänzen, z. B. `test('D2-synthetischer-Schlüssel: BEDARF_V0-Änderung nach Transportpaket-Erzeugung liefert stale:true')`, damit die Prüfspur namentlich auffindbar bleibt.

### B3 — Fehlender Fehlerpfad: Reaktion auf `stale: true` ist nicht spezifiziert

**[Fakt]** Abschnitt 2.3, Schritt 6: „Vor jeder Weiterverwendung der Antwort: `pruefeStale('transport-<lauf_id>', 2, aktuelleEingabeInhalte)` (2.5)." — der Plan endet hier. Es folgt keine Aussage, was F9 bei `stale: true` tut.
**[Fakt]** F2 (`src/lineage-registry/index.ts:234`) bietet mit `haltFestStaleEntscheidung` einen bereits existierenden, expliziten Mechanismus, um eine menschliche STALE-Entscheidung (`neu_erzeugen`/`nachtrag`/`unveraendert_gueltig`) unveränderlich festzuhalten. Dieser Mechanismus wird im gesamten Plan **kein einziges Mal** erwähnt.
**[Schlussfolgerung]** AC7/A8 prüfen nur, *dass* `stale: true` erkannt wird — nicht, was danach passiert (Exception? blockierender Rückgabewert an den Aufrufer? Aufruf von `haltFestStaleEntscheidung`? eigene Wirkungsmarke?). Das ist eine echte Lücke im Fehlerpfad, kein rein kosmetisches Zitierproblem wie B2/B5/B6.
**Fundstelle:** plan-v1 Abschnitt 2.3 Schritt 6, Abschnitt 2.5, Abschnitt 7 (A8); `src/lineage-registry/index.ts:234-271`.
**Auswirkung:** mittel — ohne Klärung entscheidet der Executor diesen Punkt beim Bauen selbst, was gegen `CLAUDE.md`s Entscheidungsregel „Entscheidung dokumentieren — niemals stillschweigend in Code verwandeln" verstößt.
**Vorschlag:** plan-v2 sollte explizit festlegen, ob `stale: true` (a) F9 einen Fehler werfen lässt, (b) einen definierten Rückgabewert an den Aufrufer liefert, der die Weiterverwendung verhindert, und/oder (c) ob/wann `haltFestStaleEntscheidung` genutzt wird, um die menschliche Entscheidung dauerhaft festzuhalten.

### B4 — F-031-Referenz in plan-v1/feature.md ist mittlerweile veraltet

**[Fakt]** plan-v1 Abschnitt 0: „`grep F-031 state/findings.md` liefert keinen Treffer — das Register endet aktuell bei F-019." `features/F9/feature.md`, Nicht-Ziele: „... in `state/findings.md` aktuell nicht als Eintrag vorhanden ...".
**[Fakt]** `state/findings.md` enthält inzwischen real **F-031** (Titel: „Werkzeug-/Bedarfsauswahl … Feature direkt nach S3 einplanen", Status offen, P1) sowie **F-036**, das erklärt, warum die Suche im plan-v1 leer lief (gespaltenes Register, seit 30.08.2026 zusammengeführt).
**[Schlussfolgerung]** Die Aussage im Plan/in der Feature-Akte war zum Prüfzeitpunkt korrekt, ist aber jetzt (gleicher Tag, nach dem Nachtrag in `state/findings.md`) nicht mehr aktuell. Das ist kein Aufweichen der bereits getroffenen Entscheidung (die Grundsatzentscheidung "F-031 bleibt zurückgestellt" wird hier nicht neu verhandelt), sondern ein reiner Referenz-Nachzug.
**Fundstelle:** `state/tasks/f9-human-transport.md` Abschnitt 0, Abschnitt 10 Punkt 3; `features/F9/feature.md` Nicht-Ziele; `state/findings.md` F-031, F-036.
**Auswirkung:** gering — kein inhaltliches Risiko, aber ein widersprüchlicher Zustand zwischen zwei am selben Tag entstandenen Dokumenten.
**Vorschlag:** Vor dem Bau in `features/F9/feature.md` (Nicht-Ziele) und plan-v1 Abschnitt 0/10 einen kurzen Nachtrag ergänzen: „F-031 ist inzwischen real in `state/findings.md` vorhanden (Stand 30.08.2026) und belegt „bewusst zurückgestellt"". Kein plan-v2 nötig, ein Halbsatz genügt.

### B5 — 2.5 hat den generischen Leitstand-Präzedenzfall korrekt, aber ohne eigene Ablageort-Konsequenz durchdacht

**[Fakt]** `scripts/leitstand-server.mjs:47-60` (`leseAktuelleEingaben`) liest `aktuelleEingabeInhalte` ausschließlich über `existsSync`/`readFileSync` echter Dateipfade — ein synthetischer, nicht-dateisystemischer Schlüssel (wie von D2 vorgeschlagen) würde von dieser generischen Funktion stillschweigend **nicht** befüllt (kein Treffer bei `existsSync`), was in `pruefeStale` zu `continue` (Zeile `src/lineage-registry/index.ts:222`) und damit zu einem übersehenen STALE-Fall führen würde.
**[Fakt]** Plan-Abschnitt 2.5 erkennt das korrekt und beschreibt separat, dass der Aufrufer für den `BEDARF_V0`-Fall selbst `ladeArtefaktVersion` aufruft und das Ergebnis unter dem synthetischen Schlüssel einfügt — die generische Leitstand-Funktion wird dafür also bewusst **nicht** wiederverwendet, sondern nur als Muster für echte Dateien zitiert.
**[Schlussfolgerung]** Die fachliche Lösung ist richtig gedacht, aber Abschnitt 5 (Ablageort) benennt keine eigene Funktion/kein eigenes Modul, das reale Dateiinhalte und die synthetische Artefakt-Referenz zu einer gemeinsamen `aktuelleEingabeInhalte`-Map zusammenführt. Ohne diese explizite Benennung besteht ein kleines Risiko, dass der Executor beim Bauen versehentlich die generische Leitstand-Funktion 1:1 wiederverwendet und den synthetischen Schlüssel dabei verliert.
**Fundstelle:** plan-v1 Abschnitt 2.5; `scripts/leitstand-server.mjs:47-60`; `src/lineage-registry/index.ts:209-232`.
**Auswirkung:** gering, aber real — betrifft direkt die Korrektheit von A8.
**Vorschlag:** In Abschnitt 5 (Ablageort) eine eigene Hilfsfunktion in `src/human-transport/index.ts` vorsehen (z. B. `baueAktuelleEingabeInhalte`), die reale Dateien liest **und** den synthetischen `BEDARF_V0`-Eintrag ergänzt — explizit getrennt von `leseAktuelleEingaben`.

### B6 — Zwei kleinere Zitierschärfe-Befunde (Muster wie F-017/F-018)

**[Fakt, gering]** Plan zitiert „ARCHITECTURE.md:41" für „Artefakte werden versioniert, nicht überschrieben" — der Satz steht real auf **Zeile 40** der aktuell gelesenen Datei. Kein inhaltlicher Fehler, reine Zeilenzahl-Ungenauigkeit.
**[Fakt, gering]** D2 formuliert: „nicht das Muster, das F2s eigene Tests bisher verwenden (`lineage-registry.test.ts` referenziert ausschließlich echte Dateien)". Real (`lineage-registry.test.ts:144-160`) liest der Test die "aktuellen Inhalte" nicht von der Platte, sondern übergibt Literal-Strings unter einem dateipfad-*förmigen* Schlüssel — es handelt sich also nicht um "echte Dateien", sondern nur um einen Schlüssel, der wie ein Dateipfad aussieht. Die Kernaussage von D2 (kein Präzedenzfall für eine reine Artefakt-zu-Artefakt-Referenz) bleibt davon unberührt und richtig — nur die Formulierung ist etwas zu stark.
**Fundstelle:** plan-v1 Abschnitt 0 (letzter Absatz), Abschnitt 4 (D2); `ARCHITECTURE.md:40`; `src/lineage-registry/lineage-registry.test.ts:144-160`.
**Auswirkung:** keine auf das Ergebnis, nur auf die Zitierschärfe.
**Vorschlag:** kosmetisch, bei Gelegenheit in plan-v2 korrigieren. Kein eigener Findings-Eintrag nötig, da Auswirkung null (vergleichbar mit F-017/F-018, die genau so eingestuft wurden).

---

## Entlastende Befunde (geprüft und in Ordnung)

- **[Fakt, entlastend]** `zielfassung.md:336` und `:341` sowie `ARCHITECTURE.md:27` wörtlich geprüft — Zitate im Plan stimmen exakt.
- **[Fakt, entlastend]** `ARCHITECTURE.md:58` (Klassifikationsreihenfolge) wörtlich geprüft — trägt D4 (`FEHLGESCHLAGEN` bei Schemaverstoß) exakt.
- **[Fakt, entlastend]** `features/F1B/feature.md` AC3 und die Terminalartefakt-Logik in `src/checkpoint-store/index.ts:530-592` (harte Validierung von `art`/`ergebnis` vor jedem Schreiben) bestätigen D3/D4 vollständig.
- **[Fakt, entlastend]** `schemas/examples/kontrollzustand-lineage-kern.valid.json:19-22` bestätigt den zitierten Herkunfts-Präzedenzfall (`erzeuger: "kern", schritt: "coach-output"`) exakt wie im Plan behauptet.
- **[Fakt, entlastend]** `scripts/check-datenformate.mjs:1-19` bestätigt die zitierte handgeschriebene Validierungskonvention (kein `ajv`) — D5 ist korrekt hergeleitet.
- **[Fakt, entlastend]** `state/plan-v1-f3-authorization-boundary.md:17-21, 238-240` bestätigt die D1-Analogie (F3 gegenüber F1B) wörtlich — der Modulschnitt-Präzedenzfall trägt.
- **[Fakt, entlastend]** `docs/projekt/umsetzungsplan-fassung-1.md:80` und `:171` bestätigen die Zitate in `features/F9/feature.md` (Deliverable-4-Tabellenzeile 9, „Coach = ChatGPT nur als manueller Kopierblock-Workflow über Human Transport") wortgleich.
- **[Fakt, entlastend]** `scripts/leitstand-server.mjs:38-45` (`lineageFelder`) und `public/leitstand/app.js:19-33, 39-43` (`checkpointZeile`, Tabellenkopf) bestätigen exakt die im Plan referenzierten Zeilenbereiche und das bedingt verzweigende Muster — Abschnitt 2.6 ist ein realer, nicht erfundener Erweiterungspunkt.
- **[Fakt, entlastend]** Abschnitt 0 des Plans ist eine ungewöhnlich sorgfältige Selbstverifikation (reale `grep`-Läufe, reale Codezeilen statt Vermutungen) — entspricht der im Projekt etablierten guten Praxis (vgl. F-013-Muster) und wurde stichprobenartig nachvollzogen, ohne Abweichung gefunden.

---

## Kurzprüfung: Format/Konsistenz `state/findings.md` F-020–F-036 gegen F-001–F-019

**[Fakt]** F-020 bis F-036 sind lückenlos durchnummeriert, jede Zeile folgt dem Kopfformat `**F-0XX** · TYP · Priorität · Status` gefolgt von Titel/Beschreibung/Fundstelle/Auswirkung/Maßnahme/Feature-Run — identisch zum Muster in F-001–F-019.
**[Fakt]** Verwendete Typen (`PROCESS_IMPROVEMENT`, `TECH_DEBT`, `HARNESS_IMPROVEMENT`, `BUG`) und Prioritäten (`P1`–`P4`) bleiben innerhalb der im Dateikopf definierten Vokabulare.
**[Fakt]** Status-Werte („gelöst", „offen", „offen (Prio von P2 auf P1 angehoben)", „offen, absichtlich zurückgestellt", „gelöst (vor Push behoben)") entsprechen bereits in F-010/F-011 etablierten Freitextmustern — keine neue, abweichende Konvention eingeführt.
**[Fakt, entlastend]** F-036 dokumentiert transparent die Ursache der Registerspaltung und schafft damit rückwirkend Konsistenz (erklärt, warum F-020–F-035 vorher nicht im Repo sichtbar waren) — das ist genau die Art von Selbstkorrektur, die das Format verlangt ("bestehende nie löschen, Status ändern").
**[Fakt, gering, bereits vor F-020 bestehend]** Die im Dateikopf angekündigte Formalform „Format je Zeile: `ID | Typ | Priorität | Status | Titel — Beschreibung | Fundstelle | Auswirkung | Maßnahme | Feature/Run`" (Pipe-getrennte Einzeiler) entspricht nicht der real gelebten Mehrzeilen-Darstellung — dieser Unterschied besteht aber bereits seit F-001 und ist keine Neuerung von F-020–F-036, daher kein spezifisch dieser Anhängung zuzurechnender Befund.

**Ergebnis Kurzprüfung:** inhaltlich vollständig und formatkonsistent zu F-001–F-019. Keine Nacharbeit nötig.

---

## Status
- [ ] Freigegeben
- [x] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

**Begründung:** D2 und D3 — die beiden vom Challenger benannten Prüfpunkte — halten der Prüfung stand; keine unbelegte Annahme, keine unnötige Komplexität, kein Abweichen von `ARCHITECTURE.md` gefunden. Zwei reale, aber nicht blockierende Lücken bleiben: der Fehlerpfad für `stale: true` (B3) und die veraltete F-031-Referenz (B4). Beide sind klein genug, um vor oder während des Bauauftrags (nicht zwingend als eigener plan-v2-Durchgang) geklärt zu werden.

## Nächster sinnvoller Schritt
Stefan entscheidet, ob B3 (Reaktion auf `stale: true`, ggf. `haltFestStaleEntscheidung`-Anbindung) und B5 (eigene Merge-Funktion für `aktuelleEingabeInhalte`) einen plan-v2 rechtfertigen oder als Klarstellung direkt in den Handoff-Vertrag wandern; B4 (F-031-Referenz) und B6 (Zitierschärfe) können als Kleinstkorrektur direkt im Plan nachgezogen werden. Erst danach: Handoff-Vertrag (Skill `handoff-vertrag`) und Bau.
