# Advisor-Findings — Feature 1: Checkpoint Store

Slug: feature1-checkpoint-store
Stand: 2026-08-29
Rolle: Advisor (frischer Kontext, `.claude/skills/advisor-pass/SKILL.md`)

## Kopf

**Geprüft:**
- `features/F1/feature.md` (vollständig)
- `state/plan-v1-feature1-checkpoint-store.md` (vollständig)

**Gegengeprüft (Fundstellen real nachgeschlagen, nicht übernommen):**
`state/findings.md`, `ARCHITECTURE.md`, `docs/projekt/zielfassung.md`,
`schemas/kontrollzustand.schema.json`, `package.json`, `.gitignore`,
`scripts/check-datenformate.mjs`, `state/gates.md`, `docs/STATUS.md`,
`state/memory-map.md`, `features/F0/*.md`, `schemas/examples/kontrollzustand*`,
Ordnerinhalt `src/`.

**Rollengrenze:** Nur `Read`, `Grep`, `Glob`. Kein Schreibzugriff, kein Bash,
kein Git, keine Ausführung — keine Datei geändert, insbesondere kein
`plan-v2`. Grenze der Prüftiefe: Code unter `src/checkpoint-store/` existiert
noch nicht (Ordner real leer, siehe Befund E4) — geprüft wurde ausschließlich
die Planlogik gegen Dokumente und Schemas, nicht ein Implementierungsverhalten.

**Branch:** `feature/f1-checkpoint-store` — passt zum Auftrag.

## Marker-Legende

`[Fakt]` im Repo belegt · `[Schlussfolgerung]` aus Fakten abgeleitet ·
`[Annahme]` unbelegte Prämisse von Spec/Plan · `[offene Unsicherheit]` weder
belegt noch widerlegt.

## Befunde

### B1 — AC11-Formulierung „schließt F-020" ist korrigierbar und sollte korrigiert werden
`[Fakt]`
`state/findings.md` endet real bei `F-019` (Grep über `^\*\*F-0\d\d\*\*`
→ 19 Treffer, höchster `F-019`, `state/findings.md:151`). Kein `F-020`
existiert im Repo. Die vorgeschlagene Ersatzformulierung — „AC11 verhindert
die in der Feature-Akte beschriebene Profilkopie-Lücke präventiv — es gab
nie einen realen Finding-Eintrag dazu" — ist sachlich zutreffend und
präziser als der aktuelle Text.
Aktueller Zustand in `features/F1/feature.md:118–121` ist bereits transparent
(„nicht verifiziert … kein `F-020` existiert im Repo"), aber behält den
missverständlichen Ausgangsbegriff „schließt F-020" bei, der weiterhin
suggeriert, es habe je einen realen Finding-Eintrag gegeben. Empfehlung:
im Handoff-Vertrag/`plan-v2` die vorgeschlagene Ersatzformulierung wörtlich
übernehmen und den Bezug auf „F-020" ganz streichen statt nur zu relativieren.
Nicht blockierend — reine Textpräzisierung, keine Verhaltensänderung.

### B2 — Gate deckt vier technische AC nicht ab; Plan nennt keine node:test-Dateien, die die Lücke schließen
`[Schlussfolgerung]`
`ARCHITECTURE.md:70–72` (Abschnitt 6) legt `node:test` als Test-Werkzeug
fest, und `package.json:14` führt `"test": "node --test"` als eigenen,
in `npm run check` (`package.json:15`) eingehängten Schritt. Das im Plan
vorgeschlagene Gate-Skript `scripts/check-checkpoint-store.mjs`
(`state/plan-v1-feature1-checkpoint-store.md:184–204`, SCOPE.7a–c) deckt
laut eigener Beschreibung nur:
- a) die vier Payload-Fixtures gegen `validiereCheckpointEintrag` (→ A2/A3/A12),
- b) einen synthetischen Drei-Checkpoint-Lauf, vollständig gültig vs. mit
  korrumpiertem Checkpoint 3 (→ A7, AC5/AC10),
- c) eine leere Kette (→ A8, AC6).

Vier der 18 technischen Akzeptanzkriterien aus Abschnitt 7 sind weder von
a–c erfasst noch an anderer Stelle im Plan einer node:test-Datei zugeordnet:
- **A4** (`state/plan-v1-feature1-checkpoint-store.md:366–368`, AC1) —
  Schreiben/Laden-Rundlauf für eine Kette mit einem, dann drei Checkpoints,
  inhaltliche Identität.
- **A5** (`:369–371`, AC2/AC3) — abgebrochener Schreibvorgang (Temp-Datei
  bleibt liegen, kein Rename) hinterlässt keinen sichtbaren Checkpoint.
- **A10** (`:384–387`, AC8) — Trennung von Kontrollzustand und
  Produktdateien; kein Aufruf verändert eine Datei außerhalb von
  `kontrollzustand/<lauf_id>/`.
- **A11** (`:388–391`, AC9) — jede Ereigniszeile pro Vorgang.

Zum Vergleich: **A9** (AC7, `:381–383`) benennt explizit „geprüft durch
Code-Review … nicht automatisiert prüfbar" — für A4/A5/A10/A11 fehlt eine
solche Zuordnung ganz, weder zum Gate noch zu Code-Review noch zu einer
eigenen Testdatei. `SCOPE.3` (`:118–145`) listet nur die Funktionen des
Moduls, keine Testdateien. Ohne diese Zuordnung bleibt offen, ob
`npm run test` (leer, sofern keine `*.test.ts`-Dateien entstehen) diese vier
Kriterien überhaupt je einmal real prüft. Empfehlung: in `plan-v2`/Handoff-
Vertrag entweder node:test-Dateien für A4/A5/A10/A11 explizit einplanen,
oder — falls bewusst Code-Review-Sache wie A9 — das ausdrücklich so
benennen statt es offenzulassen. Vor Umsetzungsbeginn zu klären, nicht
blockierend für den Plan als Ganzes.

### B3 — D3 (Rückwärtslauf bis Genesis) ist eine Auslegung, nicht wörtlich aus den Quellen ableitbar — vom Plan selbst korrekt offengelegt
`[Fakt]` + `[Schlussfolgerung]`
Gegenprobe: Weder `ARCHITECTURE.md` noch `docs/projekt/zielfassung.md`
enthalten die Begriffe „Genesis", „lückenlos" oder eine Formulierung, die
eine vollständige Rückwärtsvalidierung der Kette bis zum ersten Checkpoint
fordert (Grep auf beide Dateien, keine Treffer). Die vom Plan zitierte
„gemeinsame, append-only Hash-Kette" ist real belegt
(`docs/projekt/zielfassung.md:329`, wortgleich mit dem Zitat in
`state/plan-v1-feature1-checkpoint-store.md:36–37`) — dieser Fakt begründet
aber nur, dass Checkpoint und Wirkungsmarke eine gemeinsame Kette teilen,
nicht die Tiefe der Ladevalidierung. Der Plan benennt das selbst korrekt
als Auslegung von AC5 in Offenem Punkt 3
(`state/plan-v1-feature1-checkpoint-store.md:456–462`) — kein verdecktes
Risiko. Fachliche Einschätzung des Advisors: Die im Plan begründete Wahl
(volle Kette statt nur unmittelbarer Kandidat, `D3`,
`state/plan-v1-feature1-checkpoint-store.md:286–299`) ist die tragfähigere
Lesart, weil eine Hash-Kette ohne durchgehende Prüfung keine reale
Prüffunktion hätte — bleibt aber eine Design-Entscheidung dieses Plans,
keine zwingende Vorgabe aus Architektur oder Zielfassung. Zur Bestätigung
vorgelegt wie im Plan verlangt: bestätigt, mit dieser Einschränkung.

### B4 — Windows-Rename-Nachweis ist nur benannt, nicht mit kalibrierbarem Rot-/Grün-Fall konkretisiert
`[Fakt]`
`state/plan-v1-feature1-checkpoint-store.md:205–211` (SCOPE.8) beschreibt
das Verfahren nur als „real (nicht behauptet) zeigt, dass kein lesender
Prozess … je eine leere oder halbgeschriebene Zieldatei sieht", ohne
Zyklenzahl, Zeitspanne oder simulierte Störfaktoren zu benennen. Der Plan
selbst benennt das als offen in Offenem Punkt 4
(`state/plan-v1-feature1-checkpoint-store.md:463–468`): „Umfang … ist nicht
Teil dieses Plans — Details gehören in den Handoff-Vertrag." `ARCHITECTURE.md:95`
verlangt für jede „neu behauptete Grenze" einen kalibrierten Rot- und
Grün-Fall, bevor sie `ERZWUNGEN` heißen darf — dieser Nachweis existiert für
D4 also noch nicht, ist aber laut Auftrag nicht blockierend und wird im
Handoff-Vertrag konkretisiert. Aufgenommen wie verlangt, nicht blockierend.

### B5 — Terminologie „Rollen-Tabelle" ungenau; zitierter Inhalt (A5/A8) selbst korrekt
`[Fakt]`
`state/plan-v1-feature1-checkpoint-store.md:33` und `features/F1/feature.md:163`
zitieren `docs/projekt/zielfassung.md` als „Rollen-Tabelle (Checkpoint
Store)". Der reale Abschnitt heißt „### 16.2 Modulschnitt"
(`docs/projekt/zielfassung.md:324`), keine „Rollen"-Tabelle — es ist eine
Modul-Verantwortlichkeits-Tabelle. Der eigentliche Inhalt der Zitate (A5:
zwei Artefakttypen in einer Kette, `zielfassung.md:373`; A8:
inhaltsadressiert, kein mutierbarer Zeiger, Pfade dürfen Artefakttyp/
Execution-Identität tragen, `zielfassung.md:378`) ist wortgetreu korrekt
übernommen. Kosmetisch, keine inhaltliche Auswirkung — analog zu bereits
bekannten Mustern wie `F-017`/`F-018`.

## Entlastende Befunde

- `[Fakt, entlastend]` `ARCHITECTURE.md:39–41` (Abschnitt 2) exakt wie im
  Plan zitiert: append-only Hash-Kette, kein Commit pro Übergang,
  Referenz statt Kopie, Version = Inhalts-Hash.
- `[Fakt, entlastend]` `ARCHITECTURE.md:84` (Abschnitt 7, CRLF-Verbot) und
  `:81` (Überschreiben-Verbot) exakt wie im Plan referenziert.
- `[Fakt, entlastend]` `docs/projekt/zielfassung.md:329` exakt wortgleich
  mit dem Plan-Zitat zur gemeinsamen Hash-Kette.
- `[Fakt, entlastend]` Die im Plan beschriebene Kontrollzustand-Hülle
  (`schema_version`/`typ`/`profil_referenz{pfad,hash,version}`/optionales
  offenes `payload`, `additionalProperties: false` auf Hülle und
  `profil_referenz`) stimmt exakt mit `schemas/kontrollzustand.schema.json`
  überein.
- `[Fakt, entlastend]` `package.json:5,13,15` bestätigt `"type": "module"`,
  `tsc --noEmit` als Typprüfung, kein echter Build-Schritt — wie im Plan
  (Verifikationsabschnitt 0) behauptet.
- `[Fakt, entlastend]` `src/` ist real leer (Glob `src/**` → keine Treffer)
  — Plan-Behauptung korrekt.
- `[Fakt, entlastend]` `kontrollzustand/` und `profiles/` erscheinen nicht
  in `.gitignore` — Plan-Behauptung korrekt.
- `[Fakt, entlastend]` `scripts/check-datenformate.mjs` enthält real die
  Funktionen `validiereProfil` (Zeile 33) und `validiereKontrollzustand`
  (Zeile 66) — die vom Plan gezogene Analogie für `validiereCheckpointEintrag`
  ist zutreffend.
- `[Fakt, entlastend]` Der Plan legt seine eigenen Unsicherheiten (Offene
  Punkte 1–4) selbst offen, statt sie stillschweigend zu entscheiden —
  entspricht der Vorgabe aus dem Advisor-Pass-Skill.

## Urteil

**Freigegeben mit Hinweisen.**

Vor Umsetzungsbeginn zu klären (in `plan-v2`/Handoff-Vertrag):
- B2 (Gate-/Testabdeckung für A4, A5, A10, A11 explizit zuordnen).
- B1 (AC11-Formulierung in `features/F1/feature.md` korrigieren, „F-020"-
  Bezug streichen statt nur relativieren).

Dürfen mitlaufen, im Handoff-Vertrag konkretisiert, nicht blockierend:
- B4 (Windows-Rename-Nachweis: Methode benennen, Zyklen/Störfaktoren
  festlegen).
- B5 (Terminologie „Rollen-Tabelle" → „Modulschnitt-Tabelle" korrigieren,
  kosmetisch).

Bestätigt, kein offener Klärbedarf:
- B3 (D3 ist zulässige, im Plan selbst korrekt als Auslegung gekennzeichnete
  Design-Entscheidung).

Alle geprüften Fundstellen aus `ARCHITECTURE.md`, `docs/projekt/zielfassung.md`
und den F0-Schemas tragen gegen den realen Repo-Stand — keine einzige
zitierte Zeile oder Behauptung erwies sich als falsch, nur zwei
Ungenauigkeiten (B1 Wortwahl, B5 Tabellenbezeichnung).

## Nächster sinnvoller Schritt

`plan-v2-feature1-checkpoint-store.md` als neue Datei erstellen (Plan-Autor,
nicht dieser Advisor): B1 und B2 einarbeiten, B4/B5 als benannte offene
Punkte übernehmen, B3 als bestätigte Entscheidung stehen lassen. Danach
Handoff-Vertrag nach Skill `handoff-vertrag`.
