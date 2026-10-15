# F45 B2b-2a — Plan (Review vollständig)

Branch `f45/b2b2a-review-vollstaendig` (von origin/main `aad956c`, #341, nach B2b-1). Grundlage:
`docs/projekt/fixpaket-f45.md` (B2b-Schnitt: B2b-2 = Prüfer der Kette), F-1085 (2)(3)(4), F-1050 (Doppel-Reviewer → R),
F-1105 (Muster Spike + Allowlist), Codex-Review-Spec §8/§10 (`docs/projekt/codex-review-spec.md`). Bau erst nach
freigegebenem Plan. Nicht in diesem Bau: qa-Schritt (B2b-2b), design-guardian-Schritt im Lauf (→ B3, E-B2b-2-1),
Vorlagen, F-1111.

## Plan v1

### 0. Spike F-1085 (2) (vor dem Plan erledigt, 15.10.2026)

Echter Lauf der Claude-Code-CLI 2.1.300 (`claude-sonnet-5`) mit `--json-schema` aus `baueClaudeJsonSchema(ergebnis-code-reviewer)`,
Prompt (Rolleninstruktion + `baueReviewPolicyBlock()` + fehlerhafter Mini-Diff) über stdin, Argv wie `baueAufruf` lesend:
Exit 0, `structured_output` schemagerecht (BLOCKIERT, B1–B4 mit allen acht Befundfeldern), `result` = dasselbe JSON,
`pruefeReviewErgebnis` ohne Verstöße/Hinweise. **Schema real durchgesetzt.** Nachweis
`features/F45/nachweise/b2b2a/spike-reviewer-schema.md` (+ `.mjs`, Rohstrom geschwärzt, Ausgabe). Schema-SHA-256
`c2c3a498…18bd2`.

### 1. Ziel der Iteration

Das Review-Ergebnis kommt vollständig bei Mensch und Korrekturschleife an (ID, Evidenz, Korrekturrichtung im Neubau;
sichtbarer Hinweis bei BEREIT mit schweren Befunden), und ein Claude-Reviewer mit Schema ist ein gültiger Prüfschritt.

### 2. Referenzen

Spec §8 („Critical/High: Behebung bzw. bewusste dokumentierte Risikoentscheidung vor Freigabe“), §10 („Confirmed Findings
können an Claude zur Behebung übergeben und gezielt nachgeprüft werden“), Review-Schema v2 (`id`, `evidenz`,
`korrekturrichtung` nullable), Muster F-1105 (`plan-b2b1b.md` §0/§3), Abnahme-Ansicht `views/workflow-abnahme.js`
(`reviewHinweise`), Render-Muster `features/F45/nachweise/b2b1b2b/`.

### 3. Module und Datenbedarf

**3.1 Befund-Zusatz im Neubau (F-1085 (3))**
- `src/korrekturschleife/index.ts`: `KorrekturBefund` additiv um `id?`, `evidenz?`, `korrekturrichtung?` (je `string | null`).
  Neue reine, exportierte Funktion `baueBefundZusatzzeilen(befund): string[]` — nur vorhandene, nicht-leere Strings:
  `   Befund-ID: B1 · Evidenz: confirmed` (ID und/oder Evidenz) und `   Korrekturrichtung: …`; ohne Felder `[]`.
  `baueAusfuehrungKorrekturInstruktion` und `baueReviewKorrekturInstruktion` hängen die Zeilen direkt unter die
  bestehende Befundzeile. Fehlende Felder ⇒ kein Abbruch, Text bitgleich wie heute (Tests mit v1-Befund).
  Die Review-Instruktion bekommt die Zeilen mit, damit der Re-Review „gezielt nachprüft“ (Spec §10) — Befund-ID als
  Bezug für „behoben/offen“.
- `scripts/leitstand/f35-ws3-adjust-automatik.mjs` `baueAutomatischeAnpassungsBegruendung`: dieselben Zusatzzeilen
  (Import aus `src/korrekturschleife/index.ts`, eine Formatstelle). Die Begründung wird in der Abnahme-Entscheidung
  gespeichert und geht über `baueAusfuehrungKorrekturInstruktion` an den Neubau.
- Server: keine Änderung (`leseUrteilAusLaufakte` reicht `befunde[]` roh durch, die v2-Felder sind schon drin).

**3.2 Hinweis BEREIT mit KRITISCH/HOCH (F-1085 (4))**
- `src/review-policy/index.ts`: reine Funktion `zaehleSchwereBeiBereit(urteil, befunde): number` — Anzahl der Befunde
  mit `schwere` ∈ {KRITISCH, HOCH}, nur bei `urteil === 'BEREIT'`, sonst 0 (BEREIT_NACH_KORREKTUR/BLOCKIERT sagen schon
  selbst, dass etwas offen ist).
- GET `/api/workflows/<id>/abnahme`, `urteilProjektion` (status ok) additiv `schwere_bei_bereit: number`.
- View `reviewHinweise`: Art `schwereBeiBereit` (amber, nicht rot, kein Knopf), Text aus i18n de/en/ru/tr ohne Feldnamen
  und ohne Kennungen, z. B. de: „Der Review sagt „bereit“, meldet aber schwere Befunde (kritisch oder hoch): {anzahl}.
  Prüfe sie, bevor du abnimmst — oder wünsche eine Anpassung.“ Erscheint überall, wo die Review-Hinweise stehen (Vorab-
  Block, Review-Kachel, Zahl in „Auf einen Blick“); `reviewHinweisKennung` nimmt ihn mit (Neuzeichnen beim Poll).
- Kein Halt, kein automatischer Neubau: Regel 1b/Automatik unverändert (BEREIT löst nichts aus) — Gate belegt es.

**3.3 Claude-Reviewer mit Schema (F-1085 (2))**
- `src/workflow/index.ts`: `CLAUDE_CODE_AUSGABESCHEMAS = ['ergebnis-architecture-advisor', 'ergebnis-code-reviewer']`;
  Kommentare (Regel 4b) nennen den zweiten Spike. Der Grundtext der Regel 4b listet beide.
- Die zweite Sicherung in `loeseAusfuehrungsEingabenAuf` liest dieselbe Allowlist (keine Code-Änderung); der Reviewer
  bekommt damit `aufrufEingaben.jsonSchema`.
- `findeReviewSchritt`, Abnahme-Projektion, Regel 1b/1i/1k, Automatik und „Review wiederholen“ hängen am `output_schema`,
  nicht am Worker — sie gelten ohne Änderung für claude-code. Lesen über `leseRollenErgebnisRohstrom` (claude-Format, wie
  Advisor).
- Abnahme-Kachel „Review“ nennt heute fest „Codex“ (`entscheiden.abnahme.reviewWer`): `urteilProjektion` additiv
  `worker` (des Review-Schritts), View zeigt „Claude“ bei claude-code (neuer i18n-Schlüssel, 4 Sprachen).
- `docs/projekt/codex-review-spec.md` Kopf (oberhalb `SPEC-ANFANG`, sha-Gate unberührt): Satz „Grenze: Ein claude-code-
  Reviewer im Ablauf hat kein Ausgabeschema …“ ersetzt durch den neuen Stand.
- Vorlagen bleiben bei Codex, keine Doppel-Reviewer-Vorlage (R, F-1050).

**3.4 Gate** — neues `scripts/check-f45-b2b2-pruefer.mjs` (Muster check-f45-b2b1: echter HTTP-Testserver, Attrappe mit
echten Laufakten, kein Netz), in `package.json` nur die Gate-Zeile hinter `check-f45-b2b1-rueckweg`:
- (s0) Schemadatei = Spike-Fassung (SHA-256 wie im Nachweis).
- (k1) Review BLOCKIERT mit v2-Befund (ID, Evidenz, Korrekturrichtung) ⇒ automatischer Rückweg; nach Freigabe enthält der
  Auftragstext des Neubaus (ausfuehrung) Korrekturrichtung und Befund-ID; der Re-Review-Auftrag ebenfalls.
- (k2) Review BLOCKIERT mit v1-Befund (ohne die Felder) ⇒ Rückweg läuft, kein Abbruch, kein „Befund-ID“ im Text.
- (h1) BEREIT mit HOCH ⇒ ABGESCHLOSSEN, GET …/abnahme `schwere_bei_bereit` 1, keine Abnahme-Version (kein Neubau), nur ein
  Ausführungslauf. (h2) BEREIT ohne schwere Befunde ⇒ 0.
- (r1) claude-code-Reviewer mit `ergebnis-code-reviewer` ⇒ startet ohne Regel-4b-Klärung, Argv trägt `jsonSchema` ohne
  `$schema`/`$id`, Abnahme zeigt Urteil/Befunde, `worker` claude-code. (r2) claude-code-Reviewer BLOCKIERT ⇒ derselbe
  Rückweg wie bei Codex; (r3) FEHLGESCHLAGEN ⇒ `reviewWiederholbar` true.
- (g1) Gegenprobe: claude-code mit `ergebnis-scout` (nicht belegt) ⇒ KLAERUNG, Grund Regel 4b; zweite Sicherung lehnt ab.
- Unit-Tests rot→grün: `korrekturschleife.test.ts` (v2-Zeilen, bitgleicher v1-Text), `f35-ws3-adjust-automatik.test.mjs`,
  `review-policy` (`zaehleSchwereBeiBereit`), `workflow` (Allowlist), `workflow-abnahme.test.mjs` (Hinweis, Worker-Label).

**3.5 Render-Nachweis** `features/F45/nachweise/b2b2a/` (`instanz.mjs` + `render/erzeuge-nachweis.mjs`, Muster b2b1b2b,
Attrappe, kein Netz): Lage BEREIT mit einem HOCH-Befund (Abnahme entscheidbar); Ansichten de 1440 dunkel, de 1440 hell,
de 390, ru 390 hell, de 1440 200 %; `scrollWidth/clientWidth` gemessen. Danach design-guardian.

### 4. Zustände

Default: BEREIT ohne schwere Befunde ⇒ kein neuer Hinweis. Leer: keine Befunde ⇒ 0, nichts. Fehler: Befund ohne `schwere`
oder ohne v2-Felder ⇒ zählt nicht/keine Zusatzzeile, kein Abbruch; Projektion ohne `schwere_bei_bereit` (alt) ⇒ kein
Hinweis. Ladend: unverändert (Poll).

### 5. Akzeptanzkriterien

1. Neubau-Auftrag nach einem Review mit v2-Befunden nennt je Befund ID, Evidenz und Korrekturrichtung; ohne die Felder
   bitgleich wie heute (Unit-Test mit festem Erwartungstext).
2. BEREIT mit KRITISCH/HOCH ⇒ amber Hinweis in der Abnahme (4 Sprachen, ohne Feldnamen/Kennungen); kein Halt, kein Neubau.
3. claude-code-Reviewer mit `ergebnis-code-reviewer` startet, bekommt `--json-schema`, die Abnahme zeigt sein Ergebnis
   (Label „Claude“); andere nicht belegte Schemata an claude-code halten weiter (Regel 4b).
4. Gate grün, Unit-Tests rot→grün, Render-Nachweis 5 Ansichten ohne waagerechten Überlauf, `npm run check` Exit 0.

### 6. Risiken

- Prompt-Länge: Zusatzzeilen verlängern Neubau-Auftrag und Begründung (Begründung ohne maxLength im Schema) — gering.
- Bestehende Gates zitieren den Grundtext der Regel 4b wörtlich (check-f15-workflow) bzw. nutzen `ergebnis-code-reviewer`
  als Rotfall an claude-code (check-f15-workflow Regel-4b-Halt, check-f45-b2b1 (c6)) — Rotfall auf `ergebnis-scout`
  umstellen, Text anpassen.
- Ein Claude-Reviewer, der das Schema verfehlt: CLI-Verhalten unbelegt; der Kern hält über Regel 1b/1k (wie heute).
- CLI-Version 2.1.300 statt 2.1.299 (Startfreigabe #337): Spike lief mit 2.1.300.

### 7. Anzupassende Prüfungen (Vorabliste)

`scripts/check-f15-workflow.mjs` (Regel-4b-Halt: Schema und Grundtext), `scripts/check-f45-b2b1-rueckweg.mjs` (c6: Rotfall
`ergebnis-code-reviewer` → `ergebnis-scout`, Regex der Allowlist), ggf. Unit-Tests, die die Allowlist wörtlich prüfen.

### 8. Doku

`state/findings.md` F-1085 (2)(3)(4), neue Findings ab F-1113; `docs/projekt/fixpaket-f45.md` Zeilen B2b-2a (gebaut) und
B2b-2b (offen: qa-Schritt, F-820) und Nachtrag E-B2b-2-1 (design-guardian-Schritt → B3; „B2b geteilt“, B3-Zeile, Belege
5/6); `docs/STATUS.md`; Kopf der Codex-Review-Spec.

### Offene Punkte (nicht stillschweigend entschieden)

- O1: Der Hinweis gilt nur für BEREIT (Auftrag), nicht für BEREIT_NACH_KORREKTUR mit KRITISCH.
- O2: Die Zusatzzeilen auch im Re-Review-Auftrag (Spec §10 „gezielt nachgeprüft“) — kleiner als ein eigener Auftrag,
  bitgleich ohne Felder.

## Advisor-Pass (15.10.2026, frischer Kontext, `architecture-advisor`)

Urteil **Freigegeben mit Auflagen**; Zuschnitt: passt knapp in einen Bau + eine Korrekturrunde, wenn A2/A4 im Plan
erledigt sind; Punkt 3 nur abtrennen, wenn der Policy-Text geändert werden soll oder die Testliste aus A2 über die neun
Stellen hinauswächst.
- A1 HOCH [Fakt]: Doppelung im Neubau — die Kern-Begründung trägt die Befundliste schon (`f35-ws3-adjust-automatik.mjs`
  112–116), `baueAusfuehrungKorrekturInstruktion` hängt dieselben Befunde aus der Laufakte noch einmal an (Server 7079–7083,
  `bezug.review_lauf_id` ist auch im Kern-Pfad gesetzt). (a) Zusatzzeilen nur in der Korrekturschleife oder (b) beide.
- A2 HOCH [Fakt]: Vorabliste unvollständig — `typisierterSchritt`/`gateSchritt` haben Default `worker: 'claude-code'`;
  betroffen `src/workflow/workflow.test.ts` 1072–1081, 1083–1086, 1116–1120 (Allowlist deepEqual), 1122–1128, 1317–1325
  und `scripts/check-f15-workflow.mjs` 218–227, 2394–2400, 2411–2427 (W1), 3117. Umzug auf `ergebnis-architektur`
  (Bedeutung jedes Rotfalls bleibt).
- A3 MITTEL [Fakt]: Gegenprobe `ergebnis-scout` erreicht die zweite Sicherung nicht (scout nur `recherchierend`;
  `code-reviewer` mit fremdem Schema scheitert schon am Rollenvertrag) ⇒ `architekt` + `ergebnis-architektur` (lesend,
  claude-code erlaubt).
- A4 MITTEL [Fakt]: Policy-Text (`src/review-policy/index.ts:94`) sagt, das Format werde nur beim Codex-Reviewer
  maschinell geprüft; jede Textänderung braucht neue Policy-Version + Prüfer + sha. Empfehlung: Text bitgleich lassen
  (Spike lief mit diesem Text), Unschärfe als Finding, Kommentare (workflow/index.ts:913, Server 7127,
  review-beobachtung.test.mjs:88, check-fix-f639:28–30) anpassen.
- A5–A10 NIEDRIG: Worker-Label aus der Laufakte (`laufakte.worker ?? 'claude-code'`); Kachel „Claude-Prüfer kommt“ neben
  Claude-Urteil und grünes BEREIT neben amber Hinweis als Frage an design-guardian; Anzahl in `reviewHinweisKennung`;
  Laufzeitprüfung `typeof`/`trim` in den Zusatzzeilen, Format „nur Evidenz“, Golden-Text vor der Änderung; Invarianten
  (starteWorkflowSchritt( 6×, F-228) als AK; Spike ohne AK/Karte/Beobachtung — nicht leeres `ak_urteile` unter
  `--json-schema` unbelegt, Regel 1b/1k fängt ab.

## Entscheidung Stefan (15.10.2026, nach dem Advisor-Pass)

- A1 = (a): Zusatzzeilen nur in `src/korrekturschleife` (Neubau und Re-Review); die Begründung der Automatik bleibt
  bitgleich. Der Neubau bekommt die Felder in beiden Pfaden (Kern und Mensch) über die Befunde des Review-Laufs.

## Plan v2 (Delta zu Plan v1)

- §3.1: `baueAutomatischeAnpassungsBegruendung` unverändert (A1 = a). `baueBefundZusatzzeilen` prüft zur Laufzeit
  (`typeof === 'string'`, `trim() !== ''`); Format: `   Befund-ID: B1 · Evidenz: confirmed` / `   Befund-ID: B1` /
  `   Evidenz: confirmed`, darunter `   Korrekturrichtung: …`. Golden-Texte (v1-Befund) für beide Instruktionen und die
  Begründung vor der Änderung festgehalten (Test).
- §3.2: `reviewHinweisKennung` nimmt die Anzahl auf (A7).
- §3.3: Worker-Label aus `laufakteVersion.daten.worker ?? 'claude-code'` (A5). Policy-Text bitgleich (A4), die
  veralteten Kommentare werden angepasst, die Unschärfe des Policy-Textes wird Finding (neue ID).
- §3.4: Gegenprobe (g1) und (c6) über `architekt` + `ergebnis-architektur` (A3); (k1) prüft die genaue Zahl der
  Korrekturrichtung im Neubau-Auftrag (einmal je Befund).
- §5 AK 5: `starteWorkflowSchritt(` bleibt 6× in `scripts/leitstand-server.mjs`, F-228-Zählung unverändert (A9).
- §6: nicht leeres `ak_urteile` unter `--json-schema` unbelegt (A10), Regel 1b/1k fängt ab.
- §7: Vorabliste um A2 ergänzt (workflow.test.ts, check-f15-workflow.mjs, check-f45-b2b1 (c6)).
- Fragen an design-guardian (A6): Kachel „Urteile je Claude-Prüfer · kommt“ neben einem Claude-Urteil; grünes BEREIT
  neben dem amber Hinweis.

## Bau und Prüfpass B2b-2a (15.10.2026)

- Bau nach Plan v2: `baueBefundZusatzzeilen` (Korrekturschleife), `zaehleSchwereBeiBereit` (Review-Policy), Allowlist
  Regel 4b, GET …/abnahme `schwere_bei_bereit` + `worker`, View-Hinweis `schwereBeiBereit` + Label „Claude“, i18n (4),
  Gate `check-f45-b2b2-pruefer.mjs`, Bestandstests umgezogen (A2/A3), Render-Nachweis `features/F45/nachweise/b2b2a/`.
- Rot→grün: Unit-Tests vor der Implementierung rot (Export fehlte bzw. 3 Allowlist-Fälle); Gate gegen die Produktdateien
  im Stand HEAD rot mit 10 Befunden (k1 ×2, h1, h2, r1 ×3, r2, r3, g1), danach grün.
- Prüfpass (frischer Kontext): code-reviewer, qa, design-guardian — je „Freigegeben mit Hinweisen“, kein hoher Befund.
- Korrekturrunde: qa 2 (Hinweis nur bei offener Abnahme, Gate (h4)), qa 3 (Mensch-Pfad, Gate (h3)), qa 4 (mehrzeilige
  Korrekturrichtung einzeilig), qa 6/7 (Tests Label ohne Feld, mehrere Befunde), qa 12 / Code-Review 3 (null-Befund),
  Code-Review 2 (Gate räumt Temp-Ordner auf), 4 (Cast), 5 (Testtitel), 6 (Kommentar-Standard), 7 (Spike-Grenze im
  Nachweis); design-guardian 1 (Badge amber), 3 (Pluralform), 4 („Das Review“). Render neu erzeugt.
- Als Finding: F-1113 (Policy-Text, Spike-Grenzen; A4/A10, Code-Review 7, qa 9), F-1114 (qa 5/10/11, design-guardian
  2/4/5, Harness-Abgleich nennt beim design-guardian noch B2b).
