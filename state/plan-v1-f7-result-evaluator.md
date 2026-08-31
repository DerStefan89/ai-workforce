# Plan v1 — Feature F7: Result Evaluator

Slug: `f7-result-evaluator`
Stand: 31.08.2026

Grundlage: `features/F7/feature.md` · F6a real gebaut und gemerged
(`src/claude-code-gateway/index.ts`, PR #37/#42) · F1B
(`src/checkpoint-store/index.ts`) · F4
(`src/invocation-policy/index.ts`).

## 0. Selbstverifikation (real gelesen, nicht angenommen)

- `src/claude-code-gateway/index.ts:71` — `leseErgebnisobjekt(stdout):
  Record<string, unknown> | null`, **nicht exportiert**. Parst `stdout`
  als JSON, akzeptiert nur ein Objekt mit `type === 'result'`.
- `src/claude-code-gateway/types.ts:53-63` — `LaufakteV0Daten` trägt
  bewusst **kein** `ergebnis`-Feld und keine `permission_denials` — nur
  `beobachtungsbasis_vollstaendig: boolean` und
  `rohstrom_referenz: { pfad: string; inhalts_hash: string }`.
- `src/claude-code-gateway/index.ts:138-152` — Rohstrom wird als
  `JSON.stringify({ stdout, stderr, exitCode })` unter
  `kontrollzustand-roh/<lauf_id>/rohstrom.json` geschrieben (nicht
  committet). Der Hash im `rohstrom_referenz` ist der SHA-256 über genau
  diesen String.
- `src/checkpoint-store/index.ts:530` —
  `schreibeWirkungsmarke(laufId, profilReferenz, 'terminal', { ergebnis:
  'ERFOLGREICH'|'VERWEIGERT'|'FEHLGESCHLAGEN' }, optionen)`. Wirft
  synchron bei fehlendem/ungültigem `ergebnis` (D4).
- `src/checkpoint-store/types.ts:60-90` — `stelleLaufstatusFest` liefert
  bereits `KLAERUNG_ERFORDERLICH` mit allen fünf ARCHITECTURE-§4-
  Bestandteilen (`blockerId`, `grund`, `evidenz`,
  `aufloesungsbedingung`, `resumeZiel`), solange kein `terminal`
  geschrieben wurde. F7 muss diese Logik **nicht** nachbauen — sie
  reagiert automatisch, sobald F7 die Wirkungsmarke schreibt.
- `src/invocation-policy/index.ts:42-43` — `pruefeAufrufparameter` und
  `VERBOTENE_AUFRUFPARAMETER` sind bereits exportiert, direkt
  wiederverwendbar für E-186.
- `state/tp-nachtrag.md` — Volltextsuche: `permission_denials` und
  `result` real belegt (TP-03d Messfall 1/2, Wortlaut-Zitate). `is_error`
  und `non_execution_kind` an **keiner** Stelle real belegt — nur in
  `docs/projekt/zielfassung.md` E-184 als Konzept erwähnt, nie gegen
  echte Ausgabe geprüft. TP-01e (Messfall A/B) belegt real: kein
  Ergebnisobjekt bei Abbruch/Zeitüberschreitung → das ist bereits über
  `beobachtungsbasis_vollstaendig` abgedeckt, nicht über ein Feld im
  Ergebnisobjekt selbst.

## 1. Ziel (prüfbar)

Ein per F6a abgeschlossener Lauf (Laufakte + Rohstrom vorhanden) wird
über `klassifiziereLauf` in genau einen der drei Terminalausgänge
eingeordnet und als `terminal`-Wirkungsmarke über F1B geschrieben —
ausschließlich aus `beobachtungsbasis_vollstaendig`, dem über
`leseErgebnisobjekt` geparsten Ergebnisobjekt und `permission_denials[]`.
`is_error`/`non_execution_kind` beeinflussen die Klassifikation nicht
(F-061 bleibt bewusst offen, keine Blockade).

## 2. Scope

1. F6a: `leseErgebnisobjekt` in `src/claude-code-gateway/index.ts`
   exportieren (`export function leseErgebnisobjekt(...)`) — reine
   Sichtbarkeitsänderung, kein Verhaltensunterschied, kein neuer Test
   nötig (bestehende F6a-Tests decken das Verhalten bereits ab).
   Schließt F-062.
2. Neues Modul `src/result-evaluator/index.ts`:
   - `klassifiziereLauf(laufId: string, profilReferenz: ProfilReferenz,
     eingaben: KlassifikationsEingaben, optionen?):
     KlassifikationsErgebnis`
   - `eingaben` trägt die bereits geladene `LaufakteV0Daten` (Aufrufer
     lädt sie — F7 baut keinen eigenen Laufakte-Lesepfad, das würde F2s
     Zugriffsmuster duplizieren; siehe Design-Entscheidung 2).
   - Ablauf:
     1. Rohstrom von `laufakte.rohstrom_referenz.pfad` lesen, SHA-256
        bilden, gegen `rohstrom_referenz.inhalts_hash` vergleichen.
        Abweichung → `{ ok: true, ergebnis: 'FEHLGESCHLAGEN', grund:
        'rohstrom_integritaet' }`.
     2. `laufakte.beobachtungsbasis_vollstaendig === false` →
        `{ ergebnis: 'FEHLGESCHLAGEN', grund:
        'beobachtungsbasis_unvollstaendig' }`.
     3. Rohstrom parsen (`{stdout, stderr, exitCode}`),
        `leseErgebnisobjekt(stdout)` (F6a, importiert) aufrufen. `null`
        → `FEHLGESCHLAGEN` (kein gültiges Ergebnisobjekt trotz
        `beobachtungsbasis_vollstaendig: true` — Diagnosefall, sollte
        laut F6a-Vertrag nicht vorkommen, wird defensiv trotzdem
        geprüft).
     4. `permission_denials` aus dem Ergebnisobjekt lesen (Feld fehlt
        oder ist kein Array → wie leeres Array behandeln, nicht werfen
        — echte API-Antworten können das Feld theoretisch weglassen).
        Nicht-leer → `VERWEIGERT`.
     5. Für jede Verweigerung: `tool_input` gegen
        `VERBOTENE_AUFRUFPARAMETER` prüfen. **Korrektur nach
        Advisor-Pass (31.08.2026):** `pruefeAufrufparameter(parameter:
        string[])` (F4, `src/invocation-policy/verbotene-aufrufparameter.ts`)
        erwartet ein Tokens-Array, kein `tool_input`-Objekt — reale
        `tool_input`-Formen variieren je Werkzeugtyp (`{"command":"…"}`,
        `{"query":"…"}`, `state/tp-nachtrag.md` TP-03d Messfall 1/2). F7
        baut daher einen kleinen Adapter: relevante String-Felder aus
        `tool_input` extrahieren, bei `command` am Leerzeichen
        tokenisieren (Muster wie F6as `baueAufruf`), erst dann gegen
        `VERBOTENE_AUFRUFPARAMETER` per `pruefeAufrufparameter` prüfen.
        Das ist **kein** reiner Aufruf ohne eigenen Code — die
        `VERBOTENE_AUFRUFPARAMETER`-Liste und die Vergleichslogik in
        `pruefeAufrufparameter` werden wiederverwendet (D5), die
        Objekt→Tokens-Übersetzung ist neu (siehe Design-Entscheidung 5)
        → `bypass_verdacht_anzahl` zählen. **Nur Zählen, keine
        Eskalation** — E-186 verlangt „eskaliert und getrennt gezählt",
        F7 liefert ausschließlich das Zählen; Eskalation (wer wird wie
        benachrichtigt) ist Sache eines künftigen Aufrufers/F8 (siehe
        Nicht-Ziele).
     6. Sonst → `ERFOLGREICH`.
     7. `is_error`/`non_execution_kind` aus dem Ergebnisobjekt, falls
        vorhanden, ungeprüft ins Rückgabeobjekt kopieren (informativ,
        `unknown`-typisiert, kein Schema-Zwang).
   - Nach der Klassifikation: `schreibeWirkungsmarke(laufId,
     profilReferenz, 'terminal', { ergebnis })` (F1B, unverändert).
3. **Kein** neues Payload-Schema/Kernartefakt für die Klassifikation
   (Design-Entscheidung 1) — die Wirkungsmarke selbst trägt das
   Ergebnis vollständig, ein Parallelartefakt wäre Duplikation ohne
   neuen Zustand.
4. `scripts/check-f7-result-evaluator.mjs`: Grep-Regel gegen
   Konsolentext-Ableitung (Muster F6a AK12 — kein Code, der `stdout`
   anders als über `leseErgebnisobjekt` interpretiert), Fixture-Test
   gegen reale `state/tp-nachtrag.md`-Auszüge (TP-03d Messfall 1/2 als
   Erfolgs-/Verweigerungs-Fixture, TP-01e als
   Beobachtungsbasis-unvollständig-Fixture).
5. Tests in `src/result-evaluator/result-evaluator.test.ts`: alle drei
   Terminalausgänge, Rohstrom-Hash-Abweichung, fehlendes
   `permission_denials`-Feld, `VERBOTENE_AUFRUFPARAMETER`-Treffer in
   `tool_input`, `is_error`/`non_execution_kind` informativ
   durchgereicht ohne Einfluss auf `ergebnis`.

## 3. NICHT (Non-Scope, mit Grund)

- Eigener Laufakte-Lesepfad/Cache — Aufrufer übergibt die geladene
  Laufakte, F7 liest sie nicht selbst vom Pfad (vermeidet eine dritte,
  eigene Implementierung des F2-Lesemusters).
- „Blockiert"-Zustand aktiv erzeugen — bereits vollständig durch F1Bs
  `stelleLaufstatusFest` abgedeckt (siehe Selbstverifikation).
- Orchestrierung/Wiederaufnahme mehrerer Läufe — F8 (nicht gebaut).
- Ein eigenes `KLASSIFIKATION_V0`-Schema/Kernartefakt (Design-
  Entscheidung 1, s. o.).
- **Eskalation eines E-186-Treffers** (Benachrichtigung, Blockade o. Ä.).
  E-186 verlangt „eskaliert **und** getrennt gezählt" — F7 liefert nur
  das Zählen (`bypass_verdacht_anzahl`). Die Eskalation selbst braucht
  einen Aufrufer/Adressaten, der heute nicht existiert (F8 nicht
  gebaut) — bewusst offen, kein stillschweigend abgedeckter Teil von
  E-186 (Korrektur nach Advisor-Pass, 31.08.2026).
- Verbindliche Festlegung des exakten `is_error`/`non_execution_kind`-
  Feldnamens — bleibt Annahme, real erst durch einen echten Lauf
  (WS3, `state/tasks/f6a-ws3-realer-nachweis.md`) zu klären. F7 baut
  defensiv (Feld optional, informativ), nicht auf einer Vermutung.

## 4. Design-Entscheidungen

**1. Kein eigenes Klassifikationsartefakt, nur die Wirkungsmarke.**
`[EMPFEHLUNG]` — reversibel: sollte später ein durchsuchbarer Verlauf
aller Klassifikationen nötig werden, kann ein Artefakt ergänzt werden,
ohne die Wirkungsmarken-Semantik zu ändern. Bis dahin wäre ein
Parallelartefakt reine Duplikation (die Wirkungsmarke ist bereits Teil
derselben Hash-Kette, append-only, vollständig).

**2. Aufrufer übergibt die geladene Laufakte, F7 lädt nicht selbst.**
`[Fakt]` — F2s Lesepfad für Kernartefakte existiert bereits
(`lineage-registry`); ein zweiter, F7-eigener Lesepfad wäre Duplikation.
Der Aufrufer (künftig F8 oder ein manueller Testtreiber) lädt die
Laufakte ohnehin, um überhaupt zu wissen, welchen Lauf er klassifizieren
will.

**3. `is_error`/`non_execution_kind` informativ, nicht klassifikations-
relevant.** `[Entscheidung, aus Challenge übernommen]` — Grund: beide
Felder sind real unbelegt (F-061). Die Klassifikation stützt sich
ausschließlich auf real verifizierte Signale
(`beobachtungsbasis_vollstaendig`, `permission_denials`). Sollte WS3
das reale Feld klären, ist das ein kleiner Nachtrag, keine
Architekturänderung.

**4. Fehlendes `permission_denials`-Feld wird wie leeres Array
behandelt, nicht als Fehler.** `[Annahme]` — defensiv, weil das Feld in
den beiden real beobachteten Fällen zwar immer vorhanden war, das aber
nur zwei Stichproben sind (TP-03d Messfall 1/2). Im Bau gegen die realen
Fixtures verifizieren.

**5. `tool_input`→Tokens-Adapter für die E-186-Prüfung, neu gebaut, nicht
reiner Reuse (Korrektur nach Advisor-Pass, 31.08.2026).** `[Fakt]` —
`pruefeAufrufparameter` (F4) erwartet `string[]`, `tool_input` ist ein
Objekt mit werkzeugabhängigen Feldern (`command`, `query`, …). F7
extrahiert die String-Felder und tokenisiert `command` am Leerzeichen,
bevor `pruefeAufrufparameter` läuft. Wiederverwendet werden die Liste
`VERBOTENE_AUFRUFPARAMETER` und die Vergleichslogik selbst (D5) — die
Objekt→Tokens-Übersetzung ist neuer, eigener Code von F7, kein
bestehender Baustein. Risiko, im Bau zu verifizieren: eine naive
Tokenisierung könnte einen Umgehungsversuch, der nicht als eigenes Token
sondern eingebettet in einem längeren String steht, verfehlen — Testfall
dafür in Abschnitt 8 aufgenommen.

## 5. Ablageort

- `src/claude-code-gateway/index.ts` — `leseErgebnisobjekt` exportiert
  (Delta, kein neuer Code).
- `src/result-evaluator/index.ts`, `src/result-evaluator/types.ts`,
  `src/result-evaluator/result-evaluator.test.ts` — neu.
- `scripts/check-f7-result-evaluator.mjs` — neu.

## 6. Budget & Pässe

Ein Baudurchgang (kein WS-Split, siehe `feature.md`
Workstream-Liste) → Advisor-Pass (frischer Kontext) → Handoff-Vertrag →
Bau → Reviewer-/QA-Pass vor Merge (F-046).

## 7. Akzeptanzkriterien

Siehe `features/F7/feature.md`, AK1-10 — dieser Plan konkretisiert sie,
verändert sie nicht.

## 8. Offene Unsicherheiten dieses Plans

1. **Exakter Feldname für `is_error`/`non_execution_kind`** — bewusst
   nicht geklärt (F-061), Klassifikation hängt nicht daran.
2. **Ob `permission_denials` in der Praxis je fehlen kann** (Design-
   Entscheidung 4) — nur zwei reale Stichproben, defensive Annahme.
3. **Verhalten bei einer Laufakte, deren `rohstrom_referenz.pfad` nicht
   mehr existiert** (Rohstrom ist nicht committet, könnte gelöscht sein)
   — sollte wie Hash-Abweichung behandelt werden (`FEHLGESCHLAGEN`,
   Grund `rohstrom_fehlt`), im Bau als expliziter Testfall zu ergänzen.
4. **Tokenisierung von `tool_input.command`** (Design-Entscheidung 5) —
   ob ein einfaches Split am Leerzeichen ausreicht oder Shell-Quoting
   (Anführungszeichen, Escapes) berücksichtigt werden muss, damit ein
   eingebetteter Umgehungsversuch nicht durchrutscht. Im Bau gegen
   mindestens einen konstruierten Testfall mit eingebettetem Verbotswert
   verifizieren, nicht nur gegen die beiden realen TP-03d-Fixtures.
