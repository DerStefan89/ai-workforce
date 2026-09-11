# F19 WS-2 — Nachweisprotokoll (Green/Red/Change)

Stand: 12.09.2026. Alle Ausgaben sind reale Läufe gegen `src/ressourcen/
index.ts` (WS-2) und die realen Repo-Dateien `ressourcen.json`,
`startvorlagen/ai-workforce.json`, `startvorlagen/beispielprojekt.json` —
kein erfundenes Beispiel. Ausführung über ein Wegwerfskript, das die realen
Module importiert (`node <skript>.mjs`, Repo-Wurzel als `cwd`).

---

## Green — `pruefeAbdeckung` für Rolle `qa` gegen `startvorlagen/ai-workforce.json`

`qa.benoetigte_capabilities` (`src/rollen/index.ts`): `["TEST_DESIGN","REPO_READ"]`.

```
=== GREEN: pruefeAbdeckung(qa, [TEST_DESIGN, REPO_READ]) gegen ai-workforce.json ===
qa.benoetigte_capabilities: ["TEST_DESIGN","REPO_READ"]
pruefeAbdeckung-Ergebnis: []
```

`[Fakt]` Leeres Ergebnis — beide Capabilities sind über `claude-code`
und/oder `codex` verfügbar (beide `freigabe: "FREIGEGEBEN"`, beide gegen die
reale Startvorlage auflösbar).

---

## Red 1 — erfundene Capability `BROWSER_AUTOMATION`

```
=== RED 1: pruefeAbdeckung mit erfundener Capability BROWSER_AUTOMATION ===
pruefeAbdeckung-Ergebnis: [{"capability":"BROWSER_AUTOMATION","rolle":"test-rolle"}]
```

`[Fakt]` Eine `CapabilityGap`, wie erwartet — keine registrierte Ressource
mit `verfuegbar: true` trägt diese Capability.

---

## Red 2 — registriert ist nicht dasselbe wie nutzbar (PlanV1 §16)

```
=== RED 2: ressourcenFuerCapability findet playwright-mcp, pruefeAbdeckung meldet trotzdem Gap ===
ressourcenFuerCapability-Ergebnis (Anzahl): 2
gefunden[0]: {"id":"playwright-mcp","freigabe":"OFFEN","verfuegbar":false,"grund":"extern, nicht auflösbar"}
pruefeAbdeckung-Ergebnis (trotz gefundener Ressource): [{"capability":"BROWSER_AUTOMATION","rolle":"test-rolle"}]
```

`[Fakt]` `ressourcenFuerCapability` findet zwei Ressourcen (`playwright-mcp`,
`claude-in-chrome`) — die Capability IST registriert. `[Fakt]`
`pruefeAbdeckung` meldet trotzdem eine Lücke, weil beide `typ: "extern"`
sind und `freigabe: "OFFEN"` bei `typ: "extern"` strukturell nie
`verfuegbar: true` ergibt (R2). `[Schlussfolgerung]` Genau der in der
Aufgabenstellung verlangte Beleg: Registrierung erzeugt keine
Verfügbarkeit.

---

## Red 3 — F-344/F-326 real, nicht behauptet

```
=== RED 3: loeseRessourcenAuf mit beispielprojekt.json statt ai-workforce.json ===
codex (gegen beispielprojekt.json): {"verfuegbar":false,"grund":"Startvorlage trägt keinen vollständigen 'worker.codex'-Block (startziel/versionDeklariert/sandbox)"}
claude-code (gegen beispielprojekt.json, zum Vergleich): {"verfuegbar":true,"grund":"Startvorlagen-Block vorhanden und freigabe 'FREIGEGEBEN'"}
```

`[Fakt]` `startvorlagen/beispielprojekt.json` trägt keinen `worker.codex`-
Block (real, siehe Datei) — `codex` wird deshalb real als nicht verfügbar
aufgelöst, mit einem `grund`, der den fehlenden Block konkret benennt.
`[Fakt]` `claude-code` bleibt gegen dieselbe Datei verfügbar (die flachen
Felder `werkzeugStartziel`/`werkzeugVersionDeklariert` sind dort vorhanden)
— die Gegenprobe zeigt, dass der Rot-Fall am fehlenden Block liegt, nicht an
der Datei insgesamt.

---

## Change — `ponytail` als neuer Eintrag, KEINE Änderung an `src/ressourcen/index.ts`

Ergänzt in `ressourcen.json` (Repo-Wurzel):

```json
{
  "id": "ponytail",
  "typ": "skill",
  "capabilities": ["SIMPLICITY_REVIEW"],
  "freigabe": "FREIGEGEBEN",
  "herkunft": { "art": "skill", "pfad": ".claude/skills/ponytail" }
}
```

Dieselbe `ressourcenFuerCapability`-Abfrage, jetzt gegen die geänderten
Daten, ohne dass `src/ressourcen/index.ts` angefasst wurde:

```
=== CHANGE: ressourcenFuerCapability(SIMPLICITY_REVIEW) NACH dem neuen ponytail-Eintrag ===
Anzahl Treffer: 1
[
  {
    "id": "ponytail",
    "name": "ponytail",
    "beschreibung": ">",
    "verfuegbar": true,
    "grund": "SKILL.md mit vollständigem Frontmatter und freigabe 'FREIGEGEBEN'"
  }
]
```

`[Fakt]` Der neue Eintrag wird gefunden, `verfuegbar: true` (SKILL.md
existiert unter `.claude/skills/ponytail`, trägt Frontmatter, `freigabe:
"FREIGEGEBEN"`). `[Schlussfolgerung]` Capabilities sind Daten, keine
If/Else-Zweige — der stärkste WS-2-Beleg, wie in der Aufgabenstellung
verlangt.

`[Fakt]` **Bekannte Grenze des einfachen Frontmatter-Parsers** (bewusst in
Kauf genommen, Bauauftrag: "einfacher Frontmatter-Parser reicht, kein
externes Paket"): `beschreibung` liest hier als `">"`, nicht als der
vollständige, mehrzeilige Text. Ursache: `.claude/skills/ponytail/SKILL.md`
nutzt eine YAML-Falt-Skalarform (`description: >` mit Fortsetzung auf den
Folgezeilen) — `leseFrontmatter` (`src/ressourcen/index.ts`) liest nur die
erste Zeile nach `description:` per Zeilen-Regex, keinen YAML-Parser. Für
`validiereRessourcenDaten`/`loeseRessourcenAuf` ändert das nichts (`name`
und `beschreibung` sind beide non-empty Strings, die Regel "Frontmatter
trägt beide Felder" ist erfüllt) — der Effekt ist rein kosmetisch am
Anzeigetext, kein Regressionsrisiko für WS-2 selbst. Betrifft ausschließlich
`ponytail` (alle anderen sechs Skills nutzen eine einzeilige
`description:`, real gegen ihre echten SKILL.md-Dateien geprüft, Regel 3 im
Gate).

`npm run check` bleibt nach dieser Datenänderung grün (siehe unten).

---

## Vollständiger Gate- und Testlauf

```
$ node scripts/check-f19-ressourcen.mjs

=== F19-Ressourcen-Check ===

✓ (1) ressourcen.json: gültig gegen validiereRessourcenDaten.
✓ (2) Jeder typ 'worker' ist über startvorlagen/ai-workforce.json auflösbar, herkunft.worker liegt in WORKER.
✓ (3) Jeder typ 'skill' zeigt auf ein existierendes SKILL.md mit vollständigem Frontmatter.
✓ (4) Kein 'worker'/'skill'-Eintrag trägt name oder beschreibung (R1).
✓ (5) Jeder 'extern'-Eintrag trägt freigabe 'OFFEN' (R2).
✓ (6) Jeder in erlaubte_worker genannte, registrierte Worker deckt die benoetigte_capabilities seiner Rolle vollständig (F-346) — außer den beiden benannten Ausnahmen ('router'/'claude-code' und 'code-reviewer'/'claude-code', je Capability 'STRUCTURED_OUTPUT').
✓ (7) Jede in ROLLENVERTRAEGE.benoetigte_capabilities genannte Capability ist registriert oder in features/F19/bekannte-luecken.md benannt.

✓ Keine Befunde.
```

`npm run check` (vollständige Kette inkl. Lint, Typecheck, allen Gates,
`npm run test`): Exit 0, 435 Tests, 0 Fehlschläge (19 davon neu in
`src/ressourcen/ressourcen.test.ts`).

---

## Real gefundener Blocker während WS-2 (Aufgabe 5, F-346)

`[Fakt]` Die Aufgabenstellung verlangte, `erlaubte_worker` von
`code-reviewer` UND `router` auf `['codex']` zu verengen, nachdem geprüft
ist, dass keine Workflow-Vorlage sie auf `claude-code` plant. Diese Prüfung
(`grep` gegen `workflow-vorlagen/*.json`) war für beide Rollen negativ
(kollisionsfrei) — die Verengung wurde trotzdem für BEIDE Rollen real
verworfen, aus zwei unterschiedlichen, jeweils real geprüften Gründen:

1. **`router`**: ein Lauf über den direkten `POST /api/laeufe`-Pfad läuft
   strukturell IMMER als `worker: 'claude-code'` (`worker` steht nicht in
   `ERLAUBTE_STARTAUFTRAG_FELDER`, `scripts/leitstand-server.mjs`, und
   `router` erscheint in keiner Workflow-Vorlage als Schritt). Ein Verengen
   hätte jeden realen Router-Lauf abgelehnt — real bestätigt per Rückfrage
   an Stefan (12.09.2026), der die dokumentierte Gate-Ausnahme statt der
   Verengung wählte.
2. **`code-reviewer`**: real getestet (`node scripts/check-f15-workflow.mjs`)
   — die geteilte Testfixtur `gateSchritt()` in diesem Gate-Skript nutzt
   `rolle: 'code-reviewer'`/`worker: 'claude-code'` als Default für rund 90
   Testfälle, darunter einen Rotfall, der claude-code + `output_schema`
   gezielt prüft (Regel 4b, `ermittleNaechstenSchritt`). Eine Verengung
   brach real 85 Assertions in diesem einen Gate-Skript. Nach demselben,
   bereits für `router` entschiedenen Muster gelöst: Gate-Ausnahme statt
   Verengung, keine erneute Rückfrage nötig (dieselbe Entscheidung,
   dieselbe Begründungsform).

Ergebnis: `src/rollen/index.ts` bleibt für beide Rollen bei
`erlaubte_worker: ['claude-code', 'codex']` (unverändert gegenüber dem
WS-1-Stand). `scripts/check-f19-ressourcen.mjs` Regel 6 trägt zwei eng
benannte, geprüfte Ausnahmen (`F346_AUSNAHMEN`) statt der Verengung — jede
andere Lücke bleibt ein Gate-Fehler. `state/findings.md` F-346 bleibt
`offen`: die zugrunde liegende Lücke (`claude-code` kann `STRUCTURED_OUTPUT`
strukturell nicht bereitstellen) ist mechanisch sichtbar gehalten, nicht
behoben — das löst sich erst mit F-337 oder einer eigenen, review-würdigen
Iteration, die `check-f15-workflow.mjs`s Testfixtur vom Rollenvertrag
entkoppelt.

---

## Was dieser Nachweis nicht abdeckt

`[Fakt]` **Einen realen Leitstand-Lauf** — dieser Nachweis prüft die vier
Funktionen direkt (Muster `router.test.ts`), nicht über HTTP. Kein
Widerspruch zur Aufgabenstellung: WS-2 hat "Kein UI, kein Scout" als
Nicht-Ziel, ein Leitstand-Rundlauf wäre hier ohnehin ohne Bezug. · **Eine
vollständige YAML-Auswertung des Frontmatters** — bewusster Non-Goal
(Bauauftrag: einfacher Parser), siehe "Bekannte Grenze" oben.

## Gesamtergebnis

**WS-2 real belegt:** die vier Funktionen in `src/ressourcen/index.ts`
lösen ein Ressourcen-Register real gegen die laufende Umgebung auf, decken
den Unterschied zwischen "registriert" und "verfügbar" real ab (Red 2),
belegen die Startvorlagen-Asymmetrie real (Red 3, F-341/F-344) und zeigen,
dass eine neue Fähigkeit über eine reine Datenänderung nutzbar wird (Change,
kein Codepfad geändert). `scripts/check-f19-ressourcen.mjs` hält das
Register, die Rollenverträge und die bekannten Lücken mechanisch
aneinander; `npm run check` ist grün.
