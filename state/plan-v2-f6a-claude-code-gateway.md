# Plan v2 — Feature F6a: Claude-Code-Gateway, Lesepfad

Slug: f6a-claude-code-gateway
Stand: 2026-08-31
Grundlage: `state/plan-v1-f6a-claude-code-gateway.md` (bleibt
unverändert stehen, wird hier nicht überschrieben) plus Advisor-Urteil
`state/advisor-findings-f6a-claude-code-gateway.md`: **Freigegeben mit
Hinweisen.** Kein Blocker, kein Umbau des Modulzuschnitts (ein Modul,
Tokens-Array, zwei Ablagen, drei Workstreams) nötig. Verbindlich
vor/während des Baus zu klären: Befund 1 (Umfang der Startfreigabe für
den Lesepfad — von Stefan entschieden, siehe Delta 1) und Befund 2
(F2-Anbindung konkretisieren, Delta 2). Befund 3 (`state/gates.md`-
Zusage) wird hier zusätzlich geschlossen, statt sie dem Executor zu
überlassen (Delta 3). Befund 4 bleibt „darf mit dem Bau mitlaufen" (siehe
Offene Punkte).

## Delta 1 (löst Befund 1) — F6a ruft nur `pruefeAufrufparameter`
(E-182), nicht die volle `pruefeStartfreigabe`

**Entscheidung Stefan, 31.08.2026: Option A.** `ARCHITECTURE.md` §3 und
`docs/projekt/zielfassung.md` §16.4 („Startbedingungen des
**schreibenden** Pfades") skalieren `pruefeStartfreigabe` (E-183+E-188)
wörtlich auf die schreibende Execution — belegt zusätzlich durch
`features/F4/feature.md` Ziel und den Kopfkommentar von
`src/invocation-policy/index.ts` (vier unabhängige Quellen, siehe
Advisor-Befund 1). F6a ist der Lesepfad (Nicht-Ziele: „Execution mit
Schreibwirkung … gehören zu F6b").

**Änderung gegenüber plan-v1 Abschnitt 2, Punkt 5 und Abschnitt 4:**

- `starteGateway(eingaben, optionen)` ruft vor jedem Prozessstart
  ausschließlich `pruefeAufrufparameter(tokens)` (F4,
  `verbotene-aufrufparameter.ts`) auf — **nicht** `pruefeStartfreigabe`.
- Liefert `pruefeAufrufparameter` `{ ok: false, grund }`: `verweigereStart`
  (F4) aufrufen (dünner Aufrufer von F1Bs `schreibeWirkungsmarke`,
  unverändert, D5-konform) und **kein** Prozessstart.
- `eingaben` für `starteGateway` verlieren damit `baselineReferenz`,
  `istZustand.schutzskripte` und `wirksamkeitsnachweis` als
  Pflichtfelder — die gehören zu F6b. F6a braucht nur die Tokens und die
  Profil-/Lauf-Identität.
- **Konsequenz für F-053** (`state/findings.md`): die Begründung „Auswirkung
  … null bei F6a" ist jetzt durchgehend korrekt, nicht mehr nur
  behauptet — F6a durchläuft `pruefeStartbedingung2` gar nicht, braucht
  also keinen `wirksamkeitsnachweis` mit `rot_fall_beleg`. F-053 bleibt
  ausschließlich F6b-blockierend, unverändert im Register.
- **Konsequenz für WS3** (`scripts/verify-f6a-real-run.mjs`): der reale
  Nachweis-Lauf braucht keinen (echten oder vorgetäuschten)
  Wirksamkeitsnachweis mehr — löst die in plan-v1 offene Unsicherheit 1
  vollständig auf, kein Fake-Beleg-Risiko mehr.
- `features/F6a/feature.md` bereits korrigiert (AK4, Scope-Punkt
  „Startfreigabe", F4-Dependency-Zeile) — plan-v2 zieht nur technisch
  nach, was in der Akte bereits gilt.

**Betroffene Akzeptanzkriterien:** AK4 (siehe Delta-Tabelle unten).

## Delta 2 (löst Befund 2) — F2-Anbindung der Laufakte konkretisiert

**Fund:** plan-v1 legte `LAUFAKTE_V0` und ihren Ablagepfad
(`kontrollzustand/`) fest, sagte aber nicht, wann/wodurch sie in der
Lineage Registry registriert wird — obwohl `features/F6a/feature.md`
Dependencies F2 als „Hard, erfüllt … Registrierung der Laufakte als
kern-erzeugtes Artefakt" benennt.

**Festlegung:**

- Nach jedem Prozessstart, sobald die Laufakte (`LAUFAKTE_V0`)
  vollständig geschrieben ist — unabhängig davon, ob ein terminales
  Ergebnisobjekt vorlag oder nicht (Delta gilt für beide Fälle aus
  plan-v1 Abschnitt 2, Punkt 9/10) — ruft `starteGateway` F2s
  `registriereKernArtefakt` (`src/lineage-registry/index.ts:85`) für
  die Laufakte auf. `eingaben` der Laufakte (Tokens-Array, Profil,
  Gültigkeitsschlüssel-Anteile) werden als `eingaben`-Referenzen
  übergeben — gleiches Muster wie F5s `registriereKernArtefakt`-Aufruf
  für das Kontextpaket.
- Der Rohereignisstrom (werkzeug-erzeugt: rohe stdout/stderr-Bytes) wird
  **nicht** über F2s `registriereWerkzeugReferenz` registriert, sondern
  bleibt ausschließlich über seinen Inhalts-Hash aus der Laufakte
  referenziert (plan-v1 Abschnitt 2, Punkt 9, Ablageort
  `kontrollzustand-roh/`, nicht committet). Begründung: `registriere
  WerkzeugReferenz` ist für Referenzen auf **Produktartefakte** gedacht
  (§16.8 Punkt 1/A7 — Eigentümerschaft entscheidet, werkzeug-erzeugt =
  Referenz auf ein *Produkt*artefakt). Der Rohereignisstrom ist kein
  Produktartefakt, sondern Audit-/Diagnosematerial (E-190) — seine
  Referenzierung ist bereits durch den Inhalts-Hash in der Laufakte
  vollständig gelöst, eine zusätzliche F2-Registrierung wäre
  Doppelverbuchung ohne Mehrwert.
- Ergänzung `src/claude-code-gateway/index.ts`: `starteGateway` importiert
  `registriereKernArtefakt` aus `../lineage-registry/index.ts`, ruft es
  von außen auf (D5, kein Nachbau der Lineage-Logik).

**Betroffene Akzeptanzkriterien:** AK6 (Delta-Tabelle unten — Wortlaut
„zwei getrennte Ablagen" bleibt, ergänzt um „Laufakte wird über F2
registriert").

## Delta 3 (löst Befund 3) — `state/gates.md`-Eintrag für WS3 verbindlich zugesagt

**Fund:** AK11 verlangt einen Eintrag in `state/gates.md` nach dem Muster
`scripts/verify-rename-atomicity.mjs` (F1). plan-v1 erwähnte
`state/gates.md` nur als Zitat des F1-Präzedenzfalls, nicht als eigene
Zusage.

**Festlegung:** Nach einem erfolgreichen Lauf von
`scripts/verify-f6a-real-run.mjs` (WS3) wird ein Eintrag in
`state/gates.md` ergänzt, Format wie der bestehende F1-Eintrag (Zeile
970ff.): Datum, Skriptname, Kurzbeschreibung des realen Nachweises
(echter `claude -p`-Lauf, resultierende Laufakte + Rohstrom-Pfad als
Beleg), Vermerk „einmaliger, manueller Nachweis, nicht in `npm run
check`". Teil des WS3-Abnahmekriteriums, nicht optional.

## Akzeptanzkriterien — Delta-Tabelle (ersetzt/ergänzt betroffene AK-Nummern aus `features/F6a/feature.md`)

| AK | plan-v1 | plan-v2 |
|---|---|---|
| AK4 | `pruefeStartfreigabe` (F4) vor jedem Prozessstart | Nur `pruefeAufrufparameter` (E-182) vor jedem Prozessstart; `pruefeStartfreigabe` (E-183/E-188) bleibt F6b vorbehalten (Delta 1) |
| AK6 | Zwei getrennte Ablagen (E-190) | Zusätzlich: Laufakte wird nach Fertigstellung über F2s `registriereKernArtefakt` registriert; Rohereignisstrom bleibt ausschließlich Hash-referenziert, keine F2-Registrierung (Delta 2) |
| AK11 | Nachweis-Skript + Dokumentation in `state/gates.md` | Konkretes Eintragsformat festgelegt (Delta 3) |

Alle übrigen AK1-3, 5, 7-10, 12-13 unverändert gegenüber plan-v1/`features/F6a/feature.md`.

## Offene Punkte — dürfen mit dem Bau mitlaufen (nicht in diesem Plan geschlossen)

- **Befund 4** (Advisor) — konkretes Ausgabefeld für `modell_beobachtet`
  aus der realen `"type":"result"`-JSON-Struktur. `state/tp-nachtrag.md`
  zitiert kein `model`-Feld wörtlich; muss beim ersten echten WS3-Lauf
  am realen Output abgelesen und dokumentiert werden, nicht vorab
  spekulativ festgelegt. Executor entscheidet und dokumentiert
  (CLAUDE.md-Entscheidungsregel Punkt 5).
- Offene Unsicherheit 3 aus plan-v1 (`.gitignore`-Eintrag für
  `kontrollzustand-roh/`) — Teil von WS2, trivial.

## Rollen für diesen Workstream

Advisor-Pass abgeschlossen (`state/advisor-findings-f6a-claude-code-
gateway.md`) → plan-v2 (diese Datei) → Handoff-Vertrag
(`state/tasks/f6a-claude-code-gateway.md`) → Bau (WS1, dann WS2, dann
WS3) → Reviewer-/QA-Pass vor dem Merge (Definition of Done, F-046).

**Vorbedingung für WS2/WS3-Bau, unverändert: F-030-Harness-Vertrag**
(Bash-Kanal-Freigabe) muss abgeschlossen sein. WS1 ist unabhängig davon
baubar (Delta 1 ändert daran nichts — WS1 ruft ohnehin keinen
Prozessstart auf).
