# F45 B2b-1b — Plan (Plan-Stufe: Advisor-Schema, Plan v2)

Branch `f45/b2b1b-plan-v2` (von origin/main `4d0cf23`, nach Merge B2b-1a). Grundlage: `features/F45/plan-b2b1.md`
(Plan v1 §3.3/3.4, Advisor-Pass B2/B5/B6/B7/B11/B13/B14, Entscheidungen Stefan B1/B4/B5), Rückweg-Regel aus B2b-1a
(`pruefeRueckweg`, `grenzen.max_replans`, je Stufe 1, Halt bei gleichen Befunden, Prüfer wiederholen). Findings F-909,
F-1104, F-1105, F-1106. Bau erst nach freigegebenem Plan. Schätzung Stefan 0,5 AT.

## Plan v1

### 0. Spike F-1105 (vor dem Plan erledigt, 14.10.2026)

Echter Advisor-Lauf über die Claude-Code-CLI mit dem Argv-Muster von `baueAufruf` (lesender Werkzeugsatz,
`--output-format stream-json --verbose --tools Read,Grep,Glob …`) plus `--json-schema <Schema>`, Modell
`claude-sonnet-5`, absichtlich fehlerhafter Mini-Plan:
- Versuch 1: Schema wörtlich aus `schemas/ergebnis-architecture-advisor.schema.json` → Exit 1 nach 1,7 s:
  `--json-schema is not a valid JSON Schema: no schema with key or ref "https://json-schema.org/draft/2020-12/schema"`.
  Der CLI-Validator kennt Draft 2020-12 nicht.
- Versuch 2: dasselbe Schema ohne `$schema`/`$id` → Exit 0, 90 s, 0,18 USD. Die `result`-Zeile trägt
  `structured_output` (schemagerecht: urteil UEBERARBEITEN, drei Befunde A1–A3 mit Evidenz FAKT, Fundstellen mit
  Datei/Zeile, ein entlastender Befund, Rollengrenze) **und** `result` als denselben JSON-Text.
- Ergebnis: **`--json-schema` trägt das Schema real** — mit der Auflage, `$schema`/`$id` vor der Übergabe zu entfernen.
  Nachweis: `features/F45/nachweise/b2b1b/spike-f1105.md` + Rohstrom (`.ndjson`).
- Nicht belegt: Verhalten bei einem Modell, das das Schema verfehlt (Abbruch oder Wiederholung der CLI). Deshalb
  bleibt die Prüfung beim Lesen im Kern (§2) als zweite Linie.

### 1. Ziel der Iteration

In `hoch` läuft die Plan-Stufe wie der manuelle Ablauf: Architekt (Plan v1) → Advisor mit Urteil nach festem Schema
→ bei Befunden einmal Architekt (Plan v2) → Stefans Freigabe (sieht Plan und Advisor-Befunde) → Ausführung bekommt
nur den letzten Plan.

### 2. Advisor-Schema, Validator, Auftragstext (Umfang 1)

- `schemas/ergebnis-architecture-advisor.schema.json` (Entwurf liegt): `urteil` ∈ {FREIGEGEBEN,
  FREIGEGEBEN_MIT_AUFLAGEN, UEBERARBEITEN}; `begruendung`; `befunde[]` je `{ id, schwere (KRITISCH|HOCH|MITTEL|NIEDRIG),
  evidenz (FAKT|SCHLUSSFOLGERUNG|ANNAHME|OFFENE_UNSICHERHEIT), fundstelle, zusammenfassung, korrekturrichtung }`;
  `entlastend[]` je `{ fundstelle, zusammenfassung }`; `grenzen_der_pruefung`. Strict-Dialekt (alle Felder required,
  `additionalProperties:false` je Ebene). Beispiele `schemas/examples/ergebnis-architecture-advisor.valid*.json` und
  `.invalid-*.json` (Muster ergebnis-architektur; falls ein Gate die Beispiele gegen das Schema prüft, dort eintragen).
- `src/architecture-advisor/index.ts`: `validiereErgebnisAdvisor(geparst)` → `string[]` (handgeschrieben, D5 wie
  `validiereErgebnisArchitektur`). Geprüft nur, was der Kern verbraucht (B6): `urteil` aus der Wertemenge;
  `befunde` Array, je Befund `id`, `schwere` (Wertemenge), `fundstelle`, `zusammenfassung`, `korrekturrichtung`
  nicht-leere Strings, `id` eindeutig. Konsistenz (B5): FREIGEGEBEN ⇒ `befunde` leer; die beiden anderen ⇒ ≥ 1 Befund.
  `begruendung`/`entlastend`/`grenzen_der_pruefung`/`evidenz` erzwingt die CLI; der Kern hält ihretwegen nicht an.
- `leseAdvisorErgebnis(text)` → `{ ok: true, ergebnis } | { ok: false, verstoesse }` (JSON aus dem Ergebnistext über den
  bestehenden Leser `leseRollenErgebnisRohstrom` mit Codezaun-Fallback; dann `validiereErgebnisAdvisor`).
  `leseUrteilAusAdvisorText` und `ERLAUBTE_URTEILE` (BEREIT/…) entfallen; Aufrufer: Server (2 Stellen),
  `scripts/check-fixpaket-f35-reallauf.mjs`, Test.
- `baueArchitectureAdvisorAuftragstext`: Prosa-/„Urteil:“-Vertrag ersetzt durch JSON-Vertrag mit den Skill-Regeln
  (Fundstelle Datei/Zeile, Evidenz-Marker, entlastende Befunde, Begründung nach Schwere — was vor dem Bau zu klären ist,
  Rollengrenze; Abbildung B5: „Blockiert“ ⇒ UEBERARBEITEN mit einem Befund „Entscheidung Stefan nötig“; FREIGEGEBEN nur
  ohne Befunde). ADR-Block und Rollengrenze unverändert.

### 3. CLI-Durchsetzung (Ergebnis Spike F-1105)

- Rollenvertrag `src/rollen/index.ts`: `architecture-advisor.erlaubtes_output_schema = 'ergebnis-architecture-advisor'`.
- Regel 4b (`src/workflow/index.ts`, pure): Allowlist `CLAUDE_CODE_AUSGABESCHEMAS = ['ergebnis-architecture-advisor']`
  — claude-code mit genau diesem Schema startet; jedes andere Schema an claude-code hält weiter an (ein Schema erst nach
  echtem Lauf, F-638/F-1086). Grundtext nennt die Allowlist.
- Gateway `src/claude-code-gateway`: `AufrufEingaben.jsonSchema?: string`; `baueAufruf` hängt `--json-schema <text>`
  unmittelbar vor `-p` an (nach `--plugin-dir`); ohne Feld bleibt das Argv bitgleich. Reine Hilfsfunktion
  `baueClaudeJsonSchema(schemaText)` (exportiert): parst, entfernt `$schema` und `$id` (Spike Versuch 1), kompaktes JSON.
- Server `loeseAusfuehrungsEingabenAuf`: für worker claude-code mit aufgelöstem `ausgabeSchemaPfad` liest es die Datei
  und setzt `aufrufEingaben.jsonSchema = baueClaudeJsonSchema(...)`. Der Codex-Zweig bleibt unverändert (F-286:
  `worker`/`ausgabeSchemaPfad` weiterhin nur dort im Ergebnis).
- Nachlauf liest das Ergebnis wie bisher aus dem Ergebnistext (`result` = JSON laut Spike), nicht aus
  `structured_output` — kein zweiter Lesepfad.

### 4. Regel 1d neu (pure) und Prüfer wiederholen

- `SchrittErgebnis.advisorErgebnis?: { urteil: string | null, verstoesse: string[] }` ersetzt `advisorUrteilFehlt`
  (`types.ts`). Regel 1d (Kopplung weiter an `rolle`, weil Bestands-hoch `output_schema: null` trägt):
  `verstoesse` nicht leer ⇒ haltKlaerung („Advisor-Ergebnis unlesbar/verstößt gegen das Schema: …“, höchstens drei
  Verstöße); `urteil === 'FREIGEGEBEN'` ⇒ weiter (Allowlist); sonst haltKlaerung („Advisor: <Urteil> mit n Befund(en)
  — Plan v2 nötig“). Der Server hängt wie in 1a den Rückweg-Satz an, wenn kein Rückweg folgt (§5).
- Server: `ermittlePrueferBefund` (eine Stelle für GET/POST) und der Nachlauf lesen `leseAdvisorErgebnis` statt der
  Urteilszeile; `pruefschrittWiederholbar` Advisor-Zweig: FEHLGESCHLAGEN oder ERFOLGREICH mit `verstoesse` ⇒
  wiederholbar (F-1104 (4), Schema statt Urteilszeile). Ein gültiges MIT_AUFLAGEN/UEBERARBEITEN ist nicht
  „wiederholbar“ — dafür ist der Rückweg da.

### 5. Rückweg Plan-Stufe (Umfang 2)

- Neues optionales Schrittfeld `rueckweg: { anlass_schritt_id, vorheriger_lauf_id }` (Workflow-Schema
  `schemas/kontrollzustand-workflow-payload.schema.json`, `pruefeSchrittForm`, `types.ts`; additiv wie
  `freigabe_erteilt`). `validiereWorkflowDaten` prüft `anlass_schritt_id` als bekannte schritt_id (B11); POST
  `/api/workflows` (Anlage) entfernt ein mitgeschicktes `rueckweg` (Normalisierung wie `freigabe_erteilt`, B11).
- Zählung (B7): `rueckwegePlan` = 1, wenn ein Schritt mit Rolle `architekt` `rueckweg` trägt, sonst 0.
  `pruefeRueckweg({ stufe: 'plan', rueckwegeStufe: rueckwegePlan, rueckwegeGesamt: rueckwegePlan + zaehleKernVersionen,
  maxReplans })`. Bau-Stufe (1a) rechnet ab jetzt `rueckwegeGesamt = Bau + Plan` (hoch: max_replans 2 = 1 + 1; standard
  und fast-lane ohne Architekt unverändert). Reine Hilfe `zaehlePlanRueckwege(workflowDaten)` in der Automatik-Datei.
- Entscheidung vor dem Nachlauf-Schreiben (Muster 1a): nach einem Advisor-Lauf mit gültigem MIT_AUFLAGEN/UEBERARBEITEN
  `pruefeRueckweg`; erlaubt ⇒ nach dem Schreiben `wendePlanRueckwegAn` (Server, neben `wendeAutomatischeAnpassungAn`,
  F-228-Ort): neue Workflow-Version über `schreibeWorkflowFortschritt` mit Architekt-Schritt `OFFEN`, `lauf_id null`,
  `freigabe_erteilt` entfernt, `rueckweg = { anlass_schritt_id: <advisor>, vorheriger_lauf_id: <Plan-v1-Lauf> }`, Cursor
  auf dem Architekten, Status aus `ermittleNaechstenSchritt` (hoch: ZWINGEND ⇒ WARTET_FREIGABE). Advisor bleibt
  ERFOLGREICH mit seiner `lauf_id`. B13: trägt der Nachfolger des Advisors (Bestands-hoch) `artefakt:ergebnis-@<advisor>`,
  entfernt dieselbe Version diese Eingabe. Nicht erlaubt ⇒ Halt bleibt, Grund + Satz der Rückweg-Regel.
  Scheitert das Schreiben ⇒ Startfehlerliste, Workflow bleibt KLAERUNG (wie Bau-Automatik).
- Architekt-Start mit `rueckweg` (Startweg `starteWorkflowSchritt`, nur Textaufbau, keine neue Aufrufstelle): Auftragstext
  bekommt `baueArchitektPlanV2Instruktion({ planV1, advisor, entscheidungen })` (rein, `src/architekt/`): Plan v1
  (formatiertes JSON aus Laufakte `vorheriger_lauf_id`), je Advisor-Befund id/Schwere/Evidenz/Fundstelle/
  Zusammenfassung/Korrekturrichtung, Stefans bereits getroffene Entscheidungen zu v1 als bindender Block (B2), „Schreibe
  Plan v2 vollständig (kein Diff) im selben Schema; beantwortete Fragen nicht erneut in entscheidungen_mensch“.
  Laufakte v1 oder Advisor-Ergebnis nicht lesbar ⇒ Start abgelehnt (konflikt) mit Grund — kein stiller v2 ohne v1.
- Regel 1c nach Plan v2 (B2): Entscheidungen hängen an der `schritt_id`. Neue offene Fragen in v2 halten fail-closed:
  `architekturEntscheidungAusstehend` = es gibt Fragen in v2, deren `frage`-Text in der erfassten Entscheidung nicht
  beantwortet ist (statt „irgendeine Entscheidung existiert“). Die bestehende Entscheidungs-Route nimmt eine zweite
  Version für dieselbe schritt_id an (prüfen; sonst additive Zulassung, wenn der Schritt `rueckweg` trägt).
- Routing nach Plan v2 (pure, `ermittleNaechstenSchritt`, vor `naechsteId = vorschritt.nachfolger`): trägt der Vorschritt
  `rueckweg` und ist `rueckweg.anlass_schritt_id === vorschritt.nachfolger` und dieser Schritt ERFOLGREICH mit `lauf_id`,
  ist der nächste Schritt dessen `nachfolger` — **kein zweiter Advisor auf Plan v2** (Umfang 2, manueller Ablauf).
  `zaehleGelaufeneSchritte` (F-204) unverändert.

### 6. Ausführung nur mit dem letzten Plan (Umfang 3)

`workflow-vorlagen/hoch.json`: Advisor `output_schema: "ergebnis-architecture-advisor"`, Risiko-Text aktualisiert
(Schema per `--json-schema`, Spike); Ausführung `eingaben` ohne `artefakt:ergebnis-@schritt-2-architektur` — sie bekommt
`ergebnis-@schritt-1-architekt` (= aktuelle `lauf_id`, nach Rückweg Plan v2, E1) und `entscheidung-@schritt-1-architekt`.
`freigabe: ZWINGEND` bleibt bei allen vier Schritten.

### 7. Freigabedialog zeigt Plan und Advisor-Befunde (Umfang 4, F-1106)

- GET `/api/workflows/<id>` additiv `planFreigabe` (sonst `null`): nur bei `naechster.art === 'haltFreigabe'` und
  fälligem Schritt mit Rolle `ausfuehrung`, wenn der Ablauf einen erfolgreichen Architekt-Schritt hat:
  `{ fassung: 1 | 2, plan: { zusammenfassung, module[], entscheidungen[] (frage + gewählte Antwort) } | { fehler },
  advisor: { urteil, begruendung, befunde[] } | null }`. Laufakten fertiger Läufe ändern sich nicht ⇒ Zwischenspeicher je
  `(architektLaufId, advisorLaufId)` gegen Poll-Last.
- `views/workflow-entscheiden.js` `renderFreigabeSeite`: neue Karte „Plan, den du freigibst“ (Plan v1/v2-Kennzeichen,
  Zusammenfassung, Module, Entscheidungen) und „Befunde des Advisors“ (Urteil, Befunde mit Schwere-Badge, Fundstelle,
  Korrekturrichtung; nach Plan v2 der Satz „in Plan v2 eingearbeitet — bitte prüfen“). Bestehende Tokens/Klassen
  (Karten, Badges der Review-Befunde), `escapeHtml`, lange Texte umbrechen. i18n de/en/ru/tr. Der Freigabedialog
  (`#workflow-dialog`) bleibt; die Seite, auf der Stefan freigibt, zeigt beides.
- Render-Nachweis `npm run render-nachweis` (Plan v1 + FREIGEGEBEN, Plan v2 + Befunde; 390 px).

### 8. Gate (Umfang 5) und F-1104

`scripts/check-f45-b2b1-rueckweg.mjs` erweitert (Kopf: 1a + 1b), echter Testserver, gestubbter Worker, reale Laufakten:
- (c) hoch, Advisor UEBERARBEITEN → Workflow WARTET_FREIGABE am Architekten, Schritt trägt `rueckweg`; Freigabe → der
  Architekt-Auftragstext enthält Plan v1 und die Befund-IDs; Plan v2 ERFOLGREICH → nächster Halt ist die Freigabe der
  Ausführung (kein Advisor-Lauf), GET-Detail `planFreigabe.fassung === 2` mit Advisor-Befunden; Freigabe → die
  Ausführung bekommt als Eingabe Plan v2 (`artefakt:ergebnis-<v2-lauf>`) und kein Advisor-Ergebnis.
- (c2) Ein zweites UEBERARBEITEN nach v2 ist unmöglich: nach Plan v2 startet nie ein zweiter Advisor-Lauf (Zahl der
  Advisor-Läufe bleibt 1, Advisor-`lauf_id` unverändert); pure Gegenprobe: `pruefeRueckweg` Plan-Stufe mit
  `rueckwegeStufe 1` ⇒ gesperrt.
- (c3) FREIGEGEBEN_MIT_AUFLAGEN löst denselben Rückweg aus; `max_replans 0` ⇒ kein Rückweg, Grund nennt die Grenze.
- (c4) Advisor-Ergebnis verstößt gegen das Schema (FREIGEGEBEN mit Befund) ⇒ KLAERUNG, Prüfer wiederholbar.
- (d) FREIGEGEBEN ⇒ kein zweiter Architekt-Lauf, Ausführung bekommt Plan v1, `planFreigabe.fassung === 1`.
- Argv: der Advisor-Start trägt `--json-schema` ohne `$schema`/`$id`; Architekt/Ausführung/Review unverändert.
- F-1104 (8): 409 auf POST …/pruefer-wiederholen bei aktivem Lauf (Gate-Fall).

F-1104 mitgenommen: (4) Advisor liest das Schema statt der Urteilszeile; (8) Gate-Fall 409; (11)
`dateipfadAusFundstelle` ersetzt in einer Schleife bis zum Festpunkt; (12) Kopfkommentar/Testtitel der Automatik-Tests.
Offen (begründet): (9) `grund` in der Antwort, (10) Satz für 1k, (13) Meldung „lief erneut“ — Texte der Review-Notiz,
gehören zum UX-Durchgang F-1107; (1)(2)(3)(5)(6)(7) bei realem Bedarf (unverändert).

### 9. Anzupassende Prüfungen (Vorabliste, B3-Muster)

`check-f39-architekt.mjs` (f) Advisor `output_schema` null → neues Schema; Ausführungseingaben ohne Advisor-Ergebnis;
`check-f17-rollenvertrag.mjs` (Vertrag architecture-advisor); `check-f16-codex-gateway.mjs`/Regel-4b-Tests in
`src/workflow/workflow.test.ts`; `src/architecture-advisor/architecture-advisor.test.ts`;
`src/claude-code-gateway/claude-code-gateway.test.ts` (Argv mit/ohne `jsonSchema`); `check-fixpaket-f35-reallauf.mjs`
(`leseUrteilAusAdvisorText`); `check-f15-workflow.mjs` F-228-Zählung der `schreibeWorkflowFortschritt`-Stellen
(+1 für `wendePlanRueckwegAn`); `check-f45-f3a-plugins.mjs`/`check-f36-ws5b-skill.mjs` (Argv ohne Zusatzfeld bitgleich);
Gate (e3) aus 1a (Advisor ohne Urteilszeile ⇒ jetzt ohne gültiges JSON). Kommentare ohne Aufruf-Zeichenfolgen der
gezählten Funktionen.

### 10. Doku (Umfang 7)

`state/findings.md`: F-909 erledigt; F-1105 erledigt (Spike, Durchsetzung für den Advisor; andere Schemata an claude-code
bleiben gesperrt); F-1106 erledigt; F-1104 Nachtrag (4)(8)(11)(12); F-203 Plan-Stufe-Leser nachgetragen.
`docs/projekt/fixpaket-f45.md` Zeile B2b-1b. ARCHITECTURE.md §1 ein Satz (Advisor-Schema per `--json-schema`, Plan v2).
Nachweis Spike unter `features/F45/nachweise/b2b1b/`. Kein `.claude/`.

### 11. Zustände

Default: Plan v1 → Advisor FREIGEGEBEN → Freigabe (Plan v1 sichtbar) → Ausführung. Rückweg: Advisor
MIT_AUFLAGEN/UEBERARBEITEN → Freigabe Architekt (v2) → Plan v2 → Freigabe Ausführung (Plan v2 + Befunde sichtbar).
Leer: FREIGEGEBEN ohne Befunde ⇒ Karte „keine Befunde“. Fehler: Advisor-JSON ungültig ⇒ Halt + Prüfer wiederholen;
v1/Advisor-Laufakte fehlt ⇒ Start abgelehnt; Plan-Projektion unlesbar ⇒ Karte mit Fehlertext statt Plan.

### 12. Akzeptanzkriterien

AK1 Schema + Validator + Auftragstext; CLI trägt `--json-schema` ohne `$schema`/`$id`, Regel 4b nur für dieses Schema
offen · AK2 MIT_AUFLAGEN/UEBERARBEITEN ⇒ genau ein Architekt-Lauf v2 mit Befunden, kein zweiter Advisor; FREIGEGEBEN ⇒
direkt weiter; Grenze aus max_replans · AK3 Ausführung bekommt nur den letzten Plan; ZWINGEND bleibt · AK4 Freigabe-Seite
zeigt Plan (v1/v2) und Advisor-Befunde, Render-Nachweis · AK5 Gate (c)(c2)(c3)(c4)(d) + angepasste Prüfungen grün,
`npm run check` Exit 0 · AK6 Findings/fixpaket/Nachweis Spike.

### 13. Risiken

- R1 Bestands-hoch (Advisor `output_schema: null`, Prosa-Instruktion vor dem Update): Läufe danach bekommen den
  JSON-Vertrag ohne CLI-Durchsetzung — Kern prüft beim Lesen; ein Prosa-Ergebnis hält (Prüfer wiederholen).
- R2 Windows-Befehlszeile: das Schema (≈ 3 KB kompakt) kommt zusätzlich ins Argv; der Prompt steht dort schon.
- R3 Schätzung: Umfang ≈ 1 AT (Schema-Kette + Rückweg + UI + Gate) — über Stefans 0,5 AT.
- R4 CLI-Verhalten bei Schemaverfehlung unbelegt (Spike nur Gutfall).

### Offene Punkte (nicht stillschweigend entschieden)

O1 Regel 4b als Allowlist je Schema (nur Advisor) statt generell für claude-code öffnen — der Claude-Reviewer (F-910 (2))
   bleibt damit gesperrt, bis ein eigener echter Lauf belegt ist.
O2 `planFreigabe` nur vor der Ausführung, nicht vor dem Architekt-v2-Start (dort sähe Stefan die Befunde schon vor
   dem v2-Lauf) — bewusst schmal, Umfang 4 nennt nur die Ausführung.
O3 Regel 1c nach v2: Abgleich über den `frage`-Text (fail-closed bei neuen Fragen) statt über eine Lauf-ID in der
   Entscheidung (Entscheidungsartefakt bleibt unverändert).
O4 Kern liest `result` statt `structured_output` (Spike: identisch).
O5 Teilung, falls der Advisor die Schätzung bestätigt: 1b-1 Schema/CLI/Regel 1d (§2–4, AK1) und 1b-2 Rückweg/UI/Gate
   (§5–8).

## Advisor-Pass (14.10.2026, frischer Kontext, `architecture-advisor`)

Urteil: **Nicht freigegeben.** Rollengrenze: nur Read/Grep/Glob, kein git diff, keine Gates/Läufe.

Vor dem Bau zu klären:
- A1 HOCH [Schlussfolgerung] Entscheidungsverlust nach v2: `findeWorkflowEntscheidungFuerSchritt`
  (routen-f39.mjs:114-121) liefert nur die letzte Version je schritt_id, die Route verlangt Antworten auf die Fragen des
  aktuellen Laufs (leitstand-server.mjs:10495) — v2 ohne wiederholte Fragen ⇒ die bindenden v1-Antworten fehlen in
  `entscheidung-@` der Ausführung. Korrektur: eine Stelle führt alle Versionen je schritt_id zusammen (letzte Antwort je
  Frage gewinnt), Regel 1c und Projektion lesen sie; Gate-Fall „v2 mit neuer Frage“.
- A2 HOCH [Fakt/Schlussfolgerung] Sackgasse: 1d hält bei jedem gültigen MIT_AUFLAGEN/UEBERARBEITEN; ist der Rückweg
  gesperrt (max_replans 0) oder scheitert das Schreiben, gibt es keinen Ausweg (Prüfer wiederholen ausgeschlossen,
  /entscheidung nur für ergebnis-architektur, Abnahme braucht Ausführung, AUSWEG-Satz passt nicht). Heute läuft ein
  Advisor mit Urteil weiter zur Freigabe.
- A3 MITTEL [Fakt] Spike nicht über stdin (Produkt: Prompt per stdin, F-642); R2 falsch begründet.
- A4 MITTEL [Fakt] `leseAdvisorErgebnis` in src kann `leseRollenErgebnisRohstrom` (Server) nicht nutzen — src exportiert
  nur `validiereErgebnisAdvisor`, Server-Leser nach Muster `leseUrteilAusLaufakte`.
- A5 MITTEL [Schlussfolgerung] Kein Baudurchgang; Teilung ja, aber 1b-1 darf 1d nicht auf „≠ FREIGEGEBEN ⇒ Halt“
  stellen und die Advisor-Eingabe der Ausführung nicht entfernen (Sackgasse zwischen den Merges).

Mitlaufend: A6 Bestandsliste ergänzen (f35-ws3-adjust-automatik.test.mjs:170-195, workflow.test.ts:705-736 Regel 1d,
check-f15-workflow.mjs:3319 14/13 → 15/14 inkl. `.eingefroren`, check-fixpaket-f35-reallauf.mjs:537/542 pinnt Text und
Bitgleichheit des Advisor-Auftragstexts statt eines Aufrufs, Kommentare src/korrekturschleife/index.ts:22,106; Beispiele
im Feature-Gate prüfen wie check-f39-architekt.mjs:171) · A7 Review ist AUTOMATISCH, nicht ZWINGEND · A8 kein
Advisor-Knopf „Prüfer wiederholen“ (nur Route) · A9 Projektion auch bei der Freigabe des Architekten v2 zeigen ·
A10 uncommittete Schema-Änderung klären.

Entlastend: Rückweg ohne neue Startstelle (Muster wendeAutomatischeAnpassungAn + Nachlauf-Haken, haltFreigabe bei
ZWINGEND); Entscheidungs-Route nimmt eine zweite Entscheidung je schritt_id an; Regel 1c über Fragetext fail-closed;
`--json-schema` vor `-p` passt zum stdin-Weg, ohne Shell, Sperrliste unberührt, JSON im Argv schon üblich; Schema-
Auflösung workerunabhängig, Rollenvertrag greift; Regel 3 verhindert zweiten Advisor-Lauf, Umleitung passt; ARCHITECTURE
§1 eingehalten; O4 gedeckt.

## Plan v2

Änderungen gegenüber v1 (alles Übrige aus v1 gilt):

- **A3 erledigt:** Spike Versuch 3 mit Prompt über stdin (wie `starteGateway`): Exit 0, 65 s, 0,10 USD,
  `structured_output` schemagerecht, `result` gleich, `permission_denials` leer (`features/F45/nachweise/b2b1b/`).
  R2 neu: das Schema (≈ 3 KB) ist das einzige große Argv-Element; der Prompt geht über stdin. R4 bleibt.
- **A4:** `src/architecture-advisor` exportiert nur `validiereErgebnisAdvisor` (und den Auftragstext);
  `leseAdvisorErgebnisAusLaufakte(laufakteDaten)` im Server nach Muster `leseUrteilAusLaufakte`
  (`leseRollenErgebnisRohstrom` → Validator) → `{ urteil, befunde, begruendung, verstoesse }`.
- **A2 (Ausweg):** Regel 1d bekommt vom Aufrufer zusätzlich `planRueckwegFolgt: boolean` (vor dem Nachlauf-Schreiben
  berechnet, Muster 1a). Pure Regel: `verstoesse` ⇒ haltKlaerung (Ausweg: Prüfer wiederholen); gültiges Urteil ≠
  FREIGEGEBEN **und** `planRueckwegFolgt` ⇒ haltKlaerung „Plan v2 folgt“ (sofort von `wendePlanRueckwegAn` abgelöst);
  sonst weiter (FREIGEGEBEN oder Rückweg gesperrt) ⇒ ZWINGEND-Freigabe der Ausführung; bei gesperrtem Rückweg zeigt die
  Freigabe-Seite die Advisor-Befunde und den Satz „Kein Plan v2: <Grund aus pruefeRueckweg>“ — Stefan entscheidet
  (Freigeben oder Stoppen). Keine Sackgasse, kein neuer Ausweg-Weg.
- **A1:** `fuehreWorkflowEntscheidungenZusammen(basisVerzeichnis, workflowId, schrittId)` (routen-f39.mjs, ersetzt die
  Nutzung von `findeWorkflowEntscheidungFuerSchritt` an allen Lesestellen bzw. wird von ihr intern verwendet): alle
  Versionen je schritt_id, je `frage` gewinnt die letzte Antwort, Ergebnis in derselben Form (`antworten[]`). Regel 1c
  nach v2: offen = Fragen von v2 ohne Antwort in der Zusammenführung. `entscheidung-@` und die Projektion lesen die
  Zusammenführung. Plan-v2-Instruktion nennt die Entscheidungen bindend. Gate-Fall (c5) v2 mit neuer Frage ⇒ Halt
  Regel 1c; nach Antwort enthält `entscheidung-@` der Ausführung v1- **und** v2-Antwort.
- **A5 (Teilung, Entscheidung Stefan):** Vorschlag
  - **1b-1 „Advisor-Schema“** (≈ 0,5 AT): Schema + Beispiele (im Feature-Gate geprüft), Validator, Auftragstext, CLI-
    Durchsetzung (Rollenvertrag, Regel 4b-Allowlist, Gateway `jsonSchema`, Server), Server-Leser, Regel 1d
    **Übergangsverhalten: gültiges Urteil ⇒ weiter zur ZWINGEND-Freigabe der Ausführung** (wie heute), `verstoesse` ⇒
    Halt; Prüfer wiederholen Advisor auf Schema; hoch.json Advisor `output_schema` gesetzt, **Ausführungseingaben
    unverändert** (Advisor-Ergebnis bleibt Eingabe); Gate (c4) + Argv; F-1104 (4)(8)(11)(12); F-1105 erledigt.
  - **1b-2 „Plan v2“** (≈ 0,75 AT): Rückweg (`rueckweg`-Feld, Zählung, `wendePlanRueckwegAn`, `planRueckwegFolgt`),
    Routing, Regel 1c-Zusammenführung (A1), Ausführung ohne Advisor-Eingabe, `planFreigabe` + UI (auch vor dem
    Architekten v2, A9) mit Render-Nachweis, Gate (c)(c2)(c3)(c5)(d); F-909, F-1106 erledigt.
- **A6** in die Bestandsliste §9 übernommen; Beispiele im Feature-Gate. **A7** berichtigt: ZWINGEND bei Architekt,
  Advisor, Ausführung; Review AUTOMATISCH. **A8** Advisor-Knopf „Prüfer wiederholen“: offen → F-1104 (4) bzw. F-1107
  (UX), in 1b-1 nur Route + Grund im Halt-Text, der die Route nicht nennt, sondern „Prüfer wiederholen“ (Leitstand
  folgt). **A9** übernommen (1b-2). **A10** geklärt: die Änderung ist die `max_replans`-Beschreibung aus B2b-1a
  (nicht committet auf main liegengeblieben), kein `rueckweg`; sie wird mit diesem Branch gesichert.

## Entscheidungen Stefan (14.10.2026, nach dem Advisor-Pass)

- **A5 = Teilen.** Diese Iteration baut **B2b-1b-1 „Advisor-Schema“** mit dem Übergangsverhalten (gültiges Urteil ⇒
  weiter zur ZWINGEND-Freigabe der Ausführung, Ausführungseingaben unverändert). **B2b-1b-2 „Plan v2“** folgt als eigener
  Bau.
- **A2 = Weiter zur Freigabe.** Ist der Rückweg der Plan-Stufe gesperrt, geht der Ablauf zur ZWINGEND-Freigabe der
  Ausführung; die Seite zeigt die Advisor-Befunde und „Kein Plan v2: <Grund>“ (umgesetzt in 1b-2).

## Bau und Prüfpass B2b-1b-1 (14.10.2026)

Gebaut nach Plan v2 (Teil 1b-1) mit dem Übergangsverhalten. Abweichung vom Plan: die reine Regel 1d bekommt nur
`advisorVerstoesse` (statt `advisorErgebnis { urteil, verstoesse }`) — das Urteil braucht erst 1b-2. Tests zuerst rot
(Import fehlte), dann grün. Spike F-1105 drei echte Läufe (Nachweis `features/F45/nachweise/b2b1b/`).
Prüfpass (frischer Kontext): code-reviewer BEREIT_NACH_KORREKTUR (2 MITTEL: Rotfälle Body-`jsonSchema` und unlesbares
Schema), qa BEREIT_NACH_KORREKTUR (Halt-Text nannte nicht vorhandenen Knopf, Ursache bei Advisor-Ausfall, zweite
Sicherung der Allowlist). Eine Korrekturrunde: ehrlicher Halt-Text, Ursache auch beim Advisor, Allowlist in
`loeseAusfuehrungsEingabenAuf`, `jsonObjektFallback` für den Advisor (Bestands-hoch ohne CLI-Durchsetzung), Schema-Hash
im Nachweis + Gate (c0b), Gate (c1b)(c4b)(c4c)(c4d)(c5)(c6)(e8), Kommentare, Doku. Nachpass: code-reviewer BEREIT, qa BEREIT
(je mit Hinweisen); als Text-Nachzug übernommen: Gate (c4e) rohes JSON mit Status-Block (Gegenprobe ohne Fallback rot),
veraltete Kommentare, Fallkennung (c7) für 1b-2, Auftragstext ohne Plan-v2-Versprechen. Beim `npm run check` fielen
zwei Unit-Pins auf (`src/rollen/rollen.test.ts`, `src/router/router.test.ts`: Advisor-Schema null) — nachgezogen.
Bewusst offen: Advisor-Knopf „Prüfer wiederholen“ im Leitstand (→ 1b-2/F-1107), Codex-Advisor mit Schema nicht real
erprobt (F-1104), F-1104 (9)(10)(13), CLI-Verhalten bei Schemaverfehlen (R4).
