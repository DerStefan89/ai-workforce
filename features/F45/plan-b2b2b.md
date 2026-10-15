# F45 B2b-2b — Plan (qa-Schritt in der Kette)

Branch `f45/b2b2b-qa-schritt` (von origin/main `ff1ca5d`, #343, nach B2b-2a #342 und der Startfreigabe 2.1.300). Grundlage:
`docs/projekt/fixpaket-f45.md` (B2b-2 = 2a gebaut + 2b; design-guardian-Schritt → B3, E-B2b-2-1 = A), F-820 (qa-Schritt
fehlt), F-1085, F-1113 (2), F-1114 (6); Muster `features/F45/plan-b2b2a.md`. Bau erst nach freigegebenem Plan. Nicht in
diesem Bau: design-guardian-Schritt im Lauf (B3), Doppel-Reviewer, F-1111-Reste; kein `.claude/`, kein
`projekte.json`/`ressourcen.json`/`vorlagen/`/`.githooks`; in `workflow-vorlagen/` nur `standard.json` und `hoch.json`.

## Plan v1

### 0. Spike (vor dem Plan erledigt, 15.10.2026)

Echter Lauf der Claude-Code-CLI 2.1.300 (`claude-sonnet-5`) mit `--json-schema` aus `baueClaudeJsonSchema(ergebnis-qa)`,
Prompt = Produkttext `baueQaAuftragstext` (neu, `src/qa`) mit einem Auftrag mit drei AK und einem Nicht-Ziel plus den drei
Eingaben als Text: Exit 0, `structured_output` schemagerecht (BLOCKIERT, Q1 KRITISCH, Q2 HOCH, **vier Testfälle**, je AK
einer), `result` = dasselbe JSON, `validiereErgebnisQa` ohne Verstöße. **Schema real durchgesetzt.** Nachweis
`features/F45/nachweise/b2b2b/spike-qa-schema.md` (+ `.mjs`, Rohstrom geschwärzt, Ausgabe). Schema-SHA-256 `37749f8d…e6f6`.

### 1. Ziel der Iteration

Nach dem Review prüft ein qa-Schritt das Ergebnis aus Nutzersicht; seine Befunde laufen in dieselbe Automatik und
Korrekturschleife wie die Review-Befunde — Review und qa zusammen höchstens eine Korrekturrunde.

### 2. Referenzen

F-820 (Maßnahme: qa-Ausgabeschema + Schritt vor der Abnahme), Spec §8/§10 (`docs/projekt/codex-review-spec.md`), Muster
B2b-2a (Spike, Allowlist Regel 4b, `baueBefundZusatzzeilen`, `schwere_bei_bereit`, Render-Nachweis `nachweise/b2b2a/`),
B2b-1a (Rückweg-Regel `pruefeRueckweg`, Wiederholungs-Halt, „Prüfer wiederholen“).

### 3. Module und Datenbedarf

**3.1 Schema, Rolle, qa-Modul**
- `schemas/ergebnis-qa.schema.json` (neu, Spike-Fassung): `urteil` (BEREIT/BEREIT_NACH_KORREKTUR/BLOCKIERT), `befunde[]`
  in der Befundform des Reviews ohne `dimension` (`id`, `schwere`, `evidenz`, `fundstelle`, `zusammenfassung`,
  `korrekturrichtung`, `beleg`; nullable wie dort), `testfaelle[]` (`name`, `schritte[]`, `erwartet`, `ergebnis`
  bestanden/durchgefallen/nicht_pruefbar), `empfehlung`; `additionalProperties: false` auf jeder Ebene, alle Felder required.
- `src/rollen/index.ts`: `qa.erlaubtes_output_schema = 'ergebnis-qa'`.
- `src/qa/index.ts` (neu): `baueQaAuftragstext(auftragstext, aks, nichtZiele)` (Rolleninstruktion mit JSON-Vertrag, AK und
  Nicht-Ziele, dann der Auftrag) und `validiereErgebnisQa(geparst)` (Urteil, Befund-Schwere/Textfelder, ID eindeutig,
  `testfaelle` nicht leer mit Name/Erwartet/≥1 Schritt/Ergebnis, BLOCKIERT ⇒ ≥1 Befund). Muster `src/architecture-advisor`.
- `src/workflow/index.ts`: `CLAUDE_CODE_AUSGABESCHEMAS` += `'ergebnis-qa'` (Regel 4b, Kommentar nennt den Spike).

**3.2 Ablauf und Regeln (`ermittleNaechstenSchritt`, rein)**
- Neue Regel **1q** (Kopplung an `output_schema 'ergebnis-qa'`, Muster 1b/1d), Reihenfolge nach 1k:
  (a) `qaVerstoesse` nicht leer ⇒ haltKlaerung (Ausweg „Prüfer wiederholen“); (b) `urteil` ∉ {BEREIT,
  BEREIT_NACH_KORREKTUR} ⇒ haltKlaerung; (c) `vorpruefungBeanstandet` (Text, vom Aufrufer: der Review dieser Runde hat
  BLOCKIERT geurteilt oder AK verletzt) ⇒ haltKlaerung mit diesem Grund.
- **Aufgeschobener Review-Halt**: 1b (BLOCKIERT) und 1i (AK-Verstöße) halten nicht, wenn der `nachfolger` des Reviews
  ein Schritt mit `output_schema 'ergebnis-qa'` ist — die Kette läuft zum qa, die Entscheidung fällt nach dem qa (sonst
  liefen die Befunde nicht gemeinsam in den Neubau). Ein unlesbares/unbekanntes Urteil (1b) und ein Vertragsbruch (1k)
  halten weiter sofort am Review (Ausweg „Review wiederholen“). Ohne qa-Nachfolger (Bestand, Gate-Fixtures) bitgleich.
- `SchrittErgebnis` (`src/workflow/types.ts`) additiv: `qaVerstoesse?`, `vorpruefungBeanstandet?`.

**3.3 Server (Nachlauf, Eingaben, Abnahme)**
- `findeQaSchritt(workflowDaten)` (Kopplung an `output_schema 'ergebnis-qa'`, Muster `findeReviewSchritt`);
  `leseQaErgebnisAusLaufakte` (Muster `leseAdvisorErgebnisAusLaufakte`: `leseRollenErgebnisRohstrom` + `validiereErgebnisQa`).
- Auftragstext: Rolle `qa` ⇒ `baueQaAuftragstext(...)` mit AK/Nicht-Zielen des Auftrags (statt des rohen Auftrags).
- Nachlauf **Review**: hat der Review einen qa-Nachfolger, keine Rückweg-Entscheidung am Review (`rueckwegEntscheid`
  bleibt null) — sie fällt beim qa.
- Nachlauf **qa** (ERFOLGREICH): qa-Ergebnis lesen und prüfen; das Review-Ergebnis derselben Runde aus dem Review-Schritt
  (seine `lauf_id`, `leseUrteilAusLaufakte`, `pruefeAkUrteile`) ⇒ `vorpruefungBeanstandet`; bei gültigem qa-Ergebnis
  `ermittleAutomatischeAnpassung` mit den zusammengeführten Prüfern (siehe 3.4). Halt-Grund wie bisher um Grenze/
  Wiederholung ergänzt (`mitRueckwegGrund`).
- `wendeAutomatischeAnpassungAn` (Kern und Mensch): setzt zusätzlich den qa-Schritt zurück; `bezug` additiv
  `qa_lauf_id` (nur wenn der Ablauf einen qa-Schritt hat — Bestand bitgleich). Ebenso der `bezug` der Mensch-Entscheidung
  ANGENOMMEN/ABGELEHNT. `schemas/kontrollzustand-entscheidung-payload.schema.json` + `src/entscheidung` (Validator, Typ):
  `qa_lauf_id` optional (string|null).
- F-648-Block: der Neubau bekommt die Befunde des Reviews UND des qa (aus `bezug.review_lauf_id`/`qa_lauf_id`) — je
  Herkunft eigener Abschnitt; der qa-Lauf der neuen Runde bekommt die Begründung und seine eigenen vorherigen Befunde
  (gezielt nachprüfen, Muster Re-Review).
- `leseVorherigeReviewBefunde` → liest Review- und qa-Befunde der Vorrunde (Wiederholungs-Halt über beide).
- „Prüfer wiederholen“: `pruefschrittWiederholbar` kennt qa (FEHLGESCHLAGEN, unlesbar oder Verstoß ⇒ wiederholbar;
  gültiges BLOCKIERT ⇒ nicht, „Anpassung wünschen“); `ermittlePrueferBefund` liest `qaVerstoesse`. Route unverändert
  (setzt den Cursor-Schritt zurück).
- GET …/abnahme additiv `qa` (Projektion wie `urteil`: Status, Urteil, Befunde, Testfälle, Empfehlung, Verstöße,
  `schwere_bei_bereit` nur bei offener Abnahme, `worker`, `laufId`) und `qaWiederholbar`.

**3.4 Automatik und Korrekturschleife (`f35-ws3-adjust-automatik.mjs`, `src/korrekturschleife`)**
- `ermittleAutomatischeAnpassung` additiv `qa: { urteil, befunde } | null` (Vorgabe null ⇒ bitgleich): ausgelöst, wenn
  Review BLOCKIERT/AK-Verstoß ODER qa BLOCKIERT; `outputSchema` darf `'ergebnis-qa'` sein (Aufruf aus dem qa-Nachlauf).
  Wiederholung: `sindDieselbenBefunde` über die Vereinigung beider Befundlisten (Schlüssel Schwere|Datei wie bisher).
  Grenze unverändert (`pruefeRueckweg`, Bau-Stufe, eine Runde je Stufe, Summe `max_replans`) ⇒ Review + qa = eine Runde.
- `baueAutomatischeAnpassungsBegruendung(..., qa = null)`: mit qa Kopf „nach Review-Urteil X und qa-Urteil Y“ und je
  Herkunft ein Abschnitt („Befunde des Reviews:“ / „Befunde der Prüfung aus Nutzersicht (qa):“); ohne qa bitgleich (Golden).
- `baueAusfuehrungKorrekturInstruktion(begruendung, reviewBefunde, qaBefunde = [])`: qa-Abschnitt „Offene Befunde der
  qa-Prüfung (Nutzersicht), die diese Iteration beheben muss:“ mit derselben Zeilenform + Zusatzzeilen; ohne qa bitgleich.
- `baueReviewKorrekturInstruktion(begruendung, befunde, herkunft = 'review')`: für qa der Satz „Die vorherige qa-Prüfung
  meldete …“; sonst bitgleich.

**3.5 Vorlagen** — `standard.json` und `hoch.json`: Review-`nachfolger` → neuer Schritt `schritt-3-qa` bzw.
`schritt-5-qa` (Rolle qa, lesend, claude-code, `claude-sonnet-5`, Eingaben des Reviews + `artefakt:ergebnis-@<review>`,
`output_schema 'ergebnis-qa'`, AUTOMATISCH, 600 000 ms, `nachfolger` null). `max_schritte` reicht (standard 6, hoch 8).
`fast-lane.json` unverändert.

**3.6 Anzeige** (`views/workflow-abnahme.js`, i18n de/en/ru/tr)
- Lage „entscheidbar“: eigene Karte „Prüfung aus Nutzersicht“ unter der Kachelreihe (Prüfung · Review · Nachweise):
  Urteil-Badge (Farbe wie Review, amber bei schweren Befunden trotz BEREIT), Empfehlung, Hinweis „bereit trotz schwerer
  Befunde“ (eigener Satz, gleiche Art wie beim Review), Befunde (gleiche Liste wie Review, `renderBefunde`), Testfälle
  (Name, Schritte, Erwartet, Ergebnis-Badge). Leerzustände: kein qa-Schritt ⇒ keine Karte; keine Befunde/Testfälle ⇒ Satz.
- Lage „vorab“: Hinweis-Notiz des qa (fehlgeschlagen/nicht lesbar/Verstöße) mit Knopf „Prüfung aus Nutzersicht
  wiederholen“ (`wf-pruefer-wiederholen`, gleiche Bedienung).
- `workflows.js`: Render-Kennzeichen um qa-Status/Lauf/Hinweise/Wiederholbar.
- Sichtbarer Text ohne Feldnamen und Kennungen („qa“ nur als Rollenname in Klammern? — nein: „Prüfung aus Nutzersicht“).

**3.7 Gate** `scripts/check-f45-b2b2-pruefer.mjs` erweitert (Attrappe beantwortet auch qa-Läufe mit echter Laufakte):
- (s1) `ergebnis-qa.schema.json` = Spike-Fassung (SHA-256). (q0) `standard.json`/`hoch.json`: Review → qa, qa letzter
  Schritt mit Schema, AUTOMATISCH, claude-code; `fast-lane.json` ohne qa.
- (q1) standard läuft Ausführung → Review → qa (Reihenfolge der Läufe), qa bekommt `jsonSchema`, ABGESCHLOSSEN.
- (q2) Review BEREIT, qa BLOCKIERT ⇒ eine Korrekturrunde; Neubau-Auftrag trägt den qa-Abschnitt mit Q1 (Herkunft sichtbar).
- (q3) Review BLOCKIERT + qa BLOCKIERT ⇒ qa läuft trotzdem, genau eine Kern-Version, Neubau trägt beide Abschnitte.
- (q4) zweite Runde wieder BLOCKIERT ⇒ keine zweite Kern-Version, Halt mit Grenz-/Wiederholungsgrund.
- (q5) qa mit Schemaverstoß ⇒ KLAERUNG_ERFORDERLICH am qa, `qaWiederholbar` true, POST …/pruefer-wiederholen 200.
- (q6) fast-lane ohne qa (eine Ausführung, kein qa-Lauf). (q7) GET …/abnahme `qa`: Urteil, Befunde, Testfälle,
  `schwere_bei_bereit` 1 bei BEREIT mit HOCH.
- Bestehende Fälle (k1)–(g1) bleiben (Fixture ohne qa ⇒ Bestand bitgleich), (f) 6× bleibt.
- Unit-Tests rot→grün: `src/qa/qa.test.ts`, `src/workflow/workflow.test.ts` (1q, aufgeschobener Halt, Allowlist),
  `f35-ws3-adjust-automatik.test.mjs` (qa-Zusammenführung, Golden ohne qa), `korrekturschleife.test.ts` (qa-Abschnitt,
  Golden), `workflow-abnahme.test.mjs` (Karte, Testfälle, Hinweis, Leerzustände), `src/entscheidung` (qa_lauf_id).

**3.8 Render-Nachweis** `features/F45/nachweise/b2b2b/` (Muster b2b2a): Abnahme mit Review- und qa-Karte, ein
qa-Befund HOCH; de 1440 dunkel, de 1440 hell, de 390, ru 390 hell, de 1440 200 %; scrollWidth gemessen. Danach design-guardian.

**3.9 Nebenbei (Doku)** — F-648 gegen B2b-2a prüfen und schließen; Jarvis-Stand „12.10.2026“: Quelle ist
`docs/STATUS.md` „Aktuelle Phase“ (Stand-Klammer + F45-Satz) → `docs/projekt/kontext/lagebild.md` (Jarvis/Router lesen
es); nachziehen und Lagebild neu erzeugen. `harness-abgleich/standard.json`: Agent qa `bewusst_nicht` → `ersetzt_durch`
Schritt qa (fast-lane ohne), „B2b“ beim design-guardian → „B3“ (F-1114 (6)).

### 4. Zustände

Default: Review BEREIT, qa BEREIT ⇒ ABGESCHLOSSEN, Karte grün. Leer: keine Befunde/Testfälle ⇒ Satz; kein qa-Schritt
(fast-lane, Bestand) ⇒ keine Karte, Verhalten bitgleich. Fehler: qa FEHLGESCHLAGEN/unlesbar/Verstoß ⇒ Halt am qa, rote
Notiz mit „wiederholen“; Review unlesbar ⇒ Halt am Review wie bisher (qa läuft nicht). Ladend: Poll wie bisher.

### 5. Akzeptanzkriterien

1. standard/hoch laufen Ausführung → Review → qa; fast-lane ohne qa.
2. qa BLOCKIERT ⇒ eine Korrekturrunde; Neubau nennt die qa-Befunde mit Herkunft; Review + qa BLOCKIERT ⇒ eine Runde mit
   beiden; zweite Runde ⇒ Halt (Grenze/Wiederholung über beide Prüfer).
3. qa mit Schemaverstoß ⇒ Halt + „Prüfer wiederholen“ (Server und Knopf).
4. Abnahme zeigt Urteil, Befunde und Testfälle in eigener Karte; BEREIT mit KRITISCH/HOCH ⇒ amber Hinweis (4 Sprachen,
   ohne Feldnamen/Kennungen).
5. Gate grün, Unit-Tests rot→grün, Render-Nachweis 5 Ansichten ohne waagerechten Überlauf, `npm run check` Exit 0;
   `starteWorkflowSchritt(` 6× im Server, F-228-Zählung unverändert.

### 6. Risiken

- Vorlagenänderung trifft Gates, die mit `standard.json` echte Abläufe fahren (Attrappen ohne qa-Laufakte ⇒ Halt am qa):
  Liste in §7, Lauf der vollen Kette entscheidet.
- Aufgeschobener Review-Halt ändert das Verhalten von 1b/1i — nur mit qa-Nachfolger; Bestand und Fixtures ohne qa bitgleich.
- Ein qa-Lauf mehr je Runde (Kosten/Zeit ≈ 1 min); auch bei Review BLOCKIERT an der Grenze läuft qa noch einmal (bewusst:
  Stefan bekommt beide Befundlisten zur Entscheidung).
- `capabilities-ansicht` liest die Vorlagen (Rolle qa ⇒ Capability TEST_DESIGN) — `ressourcen.json` darf nicht geändert
  werden; falls ein Gate eine Lücke meldet: anhalten und berichten.
- Schreibstellen: alle Änderungen über bestehende `schreibeWorkflowFortschritt`-Aufrufe, kein neuer Aufruf (F-228).

### 7. Anzupassende Prüfungen (Vorabliste)

`scripts/check-f45-b2b2-pruefer.mjs` (Erweiterung), ggf. Gates mit echten standard-Abläufen
(`check-f35-ws1-feature-auftrag`, `check-fixpaket-f30-vorbedingungen` (g), `check-fix-f676-installwurzel`,
`check-f39-architekt` (f)/(l)), `src/workflow/workflow.test.ts` (Allowlist deepEqual), Rollen-Gate `check-f17-rollenvertrag`
(Fall „qa + irgendein Schema“ nutzt `ergebnis-code-reviewer` — bleibt Rotfall), `harness-abgleich.test.ts`.

### 8. Doku

`state/findings.md` (F-820 erledigt, F-648 erledigt, neue Findings ab F-1116), `fixpaket-f45.md` (B2b-2b gebaut, B2b-2
abgeschlossen), `docs/STATUS.md` (+ Lagebild), Kopf der Codex-Review-Spec nur falls nötig.

### Offene Punkte (nicht stillschweigend entschieden)

- O1: Zuschnitt — Kern (3.1–3.5, 3.7) und Anzeige (3.6, 3.8) auf einem Branch, getrennt stagebar; bei „zu groß“
  Anzeige abtrennen (Auftrag).
- O2: qa bekommt keine Projektkarte und keinen Beobachtungsblock (Zuschnitt; Spike ohne Karte) — als Finding.
- O3: Wiederholungs-Schlüssel ohne Herkunft (gleiche Schwere+Datei von Review oder qa gilt als dieselbe).

## Advisor-Pass (15.10.2026, frischer Kontext, `architecture-advisor`)

Urteil **UEBERARBEITEN**; Zuschnitt: zu groß — Schnitt 2b-1 Kern (ohne Vorlagenänderung, Bestand bitgleich) und 2b-2
Live-Schaltung mit Anzeige (Vorlagen, Harness-Zuordnung, Anzeige, Render-Nachweis), weil sonst nach dem Merge echte
qa-Läufe liefen, deren Befunde die Abnahme nicht zeigt.
- A1 HOCH [Fakt]: der aufgeschobene Halt hebelt die Vorrangfolge 1b/1i vor 1k aus — „BLOCKIERT/AK verletzt bei leerer
  Befundliste“ hielte an 1k am Review, ohne Automatik und ohne „Review wiederholen“ (`pruefschrittWiederholbar` sperrt
  bei BLOCKIERT/AK). ⇒ bei beanstandetem Review mit qa-Nachfolger auch 1k aufschieben.
- A2 HOCH [Fakt]: Objektschlüssel `qa:` außerhalb `src/rollen` macht `check-f17-rollenvertrag` AK1 rot ⇒ umbenennen.
- A3 HOCH [Fakt]: „beanstandet“ und „hat qa-Nachfolger“ dürfen nicht mehrfach entschieden werden (D5) ⇒ ein exportiertes
  Prädikat in `src/workflow` für Regel und Nachlauf; strukturiert `vorpruefung` statt Text; Lesen über `ermittlePrueferBefund`.
- A4 HOCH [Fakt]: Vorabliste unvollständig: `src/router/router.test.ts` (Vorlagen, → 2b-2), `src/rollen/rollen.test.ts`
  (qa-Schema null), `scripts/check-f15-workflow.mjs:226` (Grundtext Regel 4b), check-f17 AK1.
- A5 MITTEL: Fehlerpfade im qa-Nachlauf (Review-Ergebnis nicht lesbar ⇒ fail closed mit Grund; qa ausgefallen bei
  beanstandetem Review ⇒ Beanstandung im Grund, Ursache wie Review/Advisor).
- A6 MITTEL: jedes gültige qa-Ergebnis ist nicht wiederholbar. A7 MITTEL: Vorrunden-Befunde mit Review- und qa-Lauf der
  laufenden Runde getrennt; Wiederholungs-Text mit qa auf beide Prüfer. A8 MITTEL (Anzeige): Vorab/Blick/Rollenkreis → 2b-2.
  A9/A10 NIEDRIG: Harness-Zuordnung (→ 2b-2), Wiederholungs-Halt bringt bei Grenze 1 nur den Grund-Text (vertretbar).

## Entscheidung Stefan (15.10.2026, nach dem Advisor-Pass)

- Zuschnitt = Advisor-Schnitt: **B2b-2b-1 Kern** (dieser Bau) und **B2b-2b-2** (Vorlagen standard/hoch, Harness-Zuordnung,
  Abnahme-Karte, Vorab/Blick/Rollenkreis, Render-Nachweis, design-guardian; Gate-Fälle „standard läuft Ausführung →
  Review → qa“ und „fast-lane ohne qa“ an den echten Vorlagen).

## Plan v2 — B2b-2b-1 Kern (Delta zu Plan v1)

- **Nicht in 2b-1:** §3.5 Vorlagen, §3.6 Anzeige, §3.8 Render-Nachweis, Harness-Zuordnung (§3.9 Teil), Router-Tests.
  Ohne qa-Schritt in einer Vorlage laufen alle echten Abläufe bitgleich; qa wirkt nur in Abläufen, die den Schritt tragen
  (Gate-Fixtures, Reparaturfassung). Keine UI-Änderung ⇒ kein design-guardian, kein Render-Nachweis in 2b-1.
- **§3.2 neu (A1, A3):** exportierte reine Funktionen in `src/workflow/index.ts`: `istReviewBeanstandet(urteil,
  akVerstoesse)` (BLOCKIERT oder ≥1 AK-Verstoß) und `qaNachfolgerStartbereit(schritte, reviewSchritt)` (nachfolger mit
  `output_schema 'ergebnis-qa'`, Status OFFEN/WARTET_FREIGABE, `lauf_id` null). **Aufschub**: am Review mit tragbarem
  Urteil (eines der drei) gilt `istReviewBeanstandet && qaNachfolgerStartbereit` ⇒ 1b, 1i UND 1k halten nicht, die Kette
  läuft zum qa. Ein unbekanntes Urteil hält weiter sofort (1b). Ist der qa nicht startbereit (Reparaturfassung), hält der
  Review wie bisher und die Automatik des Reviews greift wie bisher (dasselbe Prädikat im Nachlauf).
  Regel **1q** (`output_schema 'ergebnis-qa'`): (a) `qaVerstoesse` ⇒ Halt, Ausweg „Prüfer wiederholen“; (b)
  `vorpruefung` gesetzt, aber Review-Urteil nicht eines der drei ⇒ Halt „Review-Ergebnis dieser Runde nicht lesbar“ (fail
  closed, A5); (c) qa-Urteil nicht tragend und/oder `istReviewBeanstandet(vorpruefung)` ⇒ ein Halt, der beide nennt.
  `SchrittErgebnis` additiv `qaVerstoesse?`, `vorpruefung?: { urteil, akVerstoesse }`. Allowlist Regel 4b + `ergebnis-qa`.
- **§3.3 Delta:** Review-Nachlauf: `rueckwegEntscheid` nur, wenn NICHT aufgeschoben (dasselbe Prädikat auf der Fassung
  des Nachlaufs). qa-Nachlauf: Review-Befund über `ermittlePrueferBefund(reviewSchritt, …)` (erweitert um `befunde` und
  um AK-Verstöße auch bei BLOCKIERT — bisher nur bei tragendem Urteil gelesen) ⇒ `vorpruefung`. Ursache eines
  ausgefallenen qa wie Review/Advisor in den Grund, bei beanstandetem Review um „Der Review dieser Runde hat beanstandet“
  ergänzt (A5). GET …/abnahme: Feld `qaErgebnis` (nicht `qa`, A2) und `qaWiederholbar`. `pruefschrittWiederholbar` für
  qa: FEHLGESCHLAGEN oder Verstoß gegen das Schema ⇒ wiederholbar, jedes gültige Ergebnis ⇒ nicht (A6), VERWEIGERT ⇒ nicht.
- **§3.4 Delta (A2, A7):** Parameter heißt `qaErgebnis` (nicht `qa`). `leseVorherigePrueferBefunde(workflowId,
  reviewLaufId, qaLaufId)`: Vorrunden-Befunde aus `bezug.review_lauf_id` und `bezug.qa_lauf_id`, je nur, wenn ungleich dem
  Lauf der laufenden Runde. Wiederholungs-Grund mit qa: „Die Prüfer melden nach der Korrektur dieselben Befunde …“; ohne
  qa bitgleich. „Beanstandet“ in `ermittleAutomatischeAnpassung` über `istReviewBeanstandet` (eine Stelle).
- **§3.7 Gate (2b-1, Fixtures mit qa-Schritt):** (s1) Schema-SHA; (q1) Ausführung → Review → qa, qa mit `jsonSchema` und
  Rolleninstruktion, ABGESCHLOSSEN, `qaErgebnis` mit Testfällen; (q2) qa BLOCKIERT ⇒ eine Runde, `bezug.qa_lauf_id`,
  Neubau mit qa-Abschnitt (Herkunft) und Q1, qa der neuen Runde mit seinen Vorbefunden; (q3) Review + qa BLOCKIERT ⇒ qa
  läuft, eine Runde, Neubau mit beiden Abschnitten; (q4) zweite Runde ⇒ keine zweite Kern-Version, Halt mit Grund;
  (q5) qa-Schemaverstoß ⇒ Halt am qa, `qaWiederholbar`, POST …/pruefer-wiederholen 200; (q6) A1: Review BLOCKIERT ohne
  Befunde und ohne Pflichtsatz ⇒ qa läuft, Automatik löst aus; (q7) qa BEREIT mit HOCH ⇒ `qaErgebnis.schwere_bei_bereit` 1;
  (q8) qa FEHLGESCHLAGEN bei beanstandetem Review ⇒ Halt nennt die Beanstandung, wiederholbar. (k1)–(g1), (f) bleiben.
- **§7 Delta (A4):** `src/rollen/rollen.test.ts`, `src/workflow/workflow.test.ts` (Allowlist), `scripts/check-f15-workflow.mjs`
  (Grundtext Regel 4b), `scripts/check-f17-rollenvertrag.mjs` (AK1 — keine `qa:`-Schlüssel); Router-Tests erst 2b-2.
- **§8 Delta:** F-820 bleibt offen bis 2b-2 (Nachtrag „Kern gebaut“); `fixpaket-f45.md`: B2b-2b geteilt, 2b-1 gebaut,
  2b-2 offen — B2b-2 ist erst mit 2b-2 abgeschlossen.

## Delta-Advisor-Pass (15.10.2026, frischer Kontext) und Plan v2.1

Urteil **FREIGEGEBEN_MIT_AUFLAGEN** (A1–A7 sachlich gelöst). Eingearbeitet:
- D1 HOCH: der Aufschub gilt nur, wenn derselbe Ablauf mit tragendem Review den qa tatsächlich startet (Regeln 2/3/4/4b/5
  über einen zweiten Aufruf von `ermittleNaechstenSchritt` mit tragendem Review — eine Regelquelle); sonst hält der Review
  wie bisher. Im Nachlauf löst die Automatik nur bei `naechster.art === 'haltKlaerung'` aus (aus dem Ausgang abgeleitet,
  keine zweite Prädikatsauswertung im Server). Unit-Fall: qa ZWINGEND / `max_schritte` erreicht.
- D2: AK-Block 2b-1 (unten). D3: Gate-Fälle (q9) Review BEREIT mit AK-Verstoß + qa BEREIT ⇒ eine Runde nach dem qa;
  (q10) Mensch-Anpassung bei Halt am qa ⇒ `bezug.qa_lauf_id`; „qa nicht startbereit“ als Unit-Fall (Reparaturfassung).
  (q4) erwartet die Grenze (andere Befunde in Runde 2); die Wiederholung über beide Prüfer belegt der Unit-Test.
- D4: `vorpruefung` kommt vom Review, dessen `nachfolger` der qa ist; ist er nicht ERFOLGREICH oder unlesbar ⇒
  `{ urteil: null }` ⇒ 1q (b); undefined nur ohne Review davor. `ermittlePrueferBefund` liest beim Review AK-Verstöße und
  Befunde auch bei BLOCKIERT.
- D5: 1q (a) nennt eine Beanstandung des Reviews mit. D6: qa-Auftragstext gekoppelt an `output_schema 'ergebnis-qa'`.
- D7: Schemadatei LF/ohne BOM (check-f16); Rotfall-Name check-f17 nachgezogen; F-228-Zählung per grep im Review.
- Zuschnitt (D7, offen): GET …/abnahme `qaErgebnis`/`qaWiederholbar` gehen mit der Anzeige nach **2b-2**; (q7) ebenso.
  (q5) belegt „Prüfer wiederholen“ über POST …/pruefer-wiederholen.

### Akzeptanzkriterien B2b-2b-1

1. `ergebnis-qa` ist Schema der Rolle qa und an claude-code per `--json-schema` zugelassen (Spike, s1, Unit Regel 4b).
2. Ein Ablauf mit qa-Schritt läuft Ausführung → Review → qa; der qa bekommt Rolleninstruktion und Schema (q1).
3. qa BLOCKIERT, Review beanstandet oder beides ⇒ genau eine Korrekturrunde nach dem qa; der Neubau nennt die Befunde je
   Herkunft; der qa der neuen Runde bekommt seine Vorbefunde (q2, q3, q6, q9, q10).
4. Eine zweite beanstandete Runde löst keine weitere Runde aus; Halt mit Grund (q4; Wiederholung über beide: Unit).
5. qa mit Schemaverstoß oder Ausfall ⇒ Halt am qa, „Prüfer wiederholen“ möglich; Beanstandung des Reviews im Grund (q5, q8).
6. Ohne qa-Schritt (alle Vorlagen, Bestand) bitgleich: (k1)–(g1) grün, Golden-Tests; `starteWorkflowSchritt(` 6×.

## Bau und Prüfpass B2b-2b-1 (15.10.2026)

- Bau nach Plan v2.1. Rot→grün: Unit-Tests vor der Implementierung rot (Korrekturschleife 3, Workflow: fehlende Exporte,
  Rollen 1, Automatik 6, Entscheidung 1, Workflow D1 2); `src/qa`-Tests nach dem Modul (das Modul entstand für den Spike).
  Gate gegen die Produktdateien im Stand HEAD (Export ohne `kontrollzustand/`) rot mit 15 Befunden, danach grün.
- Prüfpass (frischer Kontext): code-reviewer und qa je „Freigegeben mit Hinweisen“, kein hoher Befund; design-guardian
  entfällt (keine UI-Änderung in 2b-1).
- Korrekturrunde: qa 1 (Halt-Text verspricht keine Runde mehr), qa 3 (fehlende Review-Laufakte der Vorrunde ⇒ kein
  Vergleich), qa 4a/4b (Gate (q5)(q8) mit Start nach „Prüfer wiederholen“, neuer Fall (q11) Wiederholung über beide Prüfer —
  ersetzt den Unit-Beleg bei AK 4), Code-Review 1 (Auftrag bei BLOCKIERT nur im qa-Nachlauf gelesen, nicht im Poll), 2
  (Beanstandungssatz ohne bekannte Ursache), 4 (Doku), 5 (Parametername), 7 (`AuftragAkzeptanzkriterium`).
- Nachpass: code-reviewer und qa je „Freigegeben mit Hinweisen“, alle Punkte erledigt; Resthinweise (toter `?? []`,
  Leerzeile in `src/qa`, F35-Altkommentar „NIE 'starte'“, Testtitel, zwei Formulierungen desselben Halt-Satzes, F3-Zweig
  ohne Test) und die übrigen Erstpass-Punkte in F-1116; Live-Schaltung und Anzeige in F-1117 (B2b-2b-2).
