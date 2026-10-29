<!--
Diese Datei selbst ist NICHT Teil des kopierten Skeletts — kopiereSkelett
(src/projekt-anlegen/index.ts) überspringt sie ausdrücklich.
-->

# Herkunft — vorlagen/projekt-skelett/

F42 Projekt-Harness WS-1 (E-F41-3 = B, Schichtenmodell Baseline/Skelett/
Füllung, `docs/projekt/zielfassung.md` §13.6). Nachgezogen in F45 B1a-2
(11.10.2026, `features/F45/plan-b1a2.md`).

**Quelle:** `https://github.com/DerStefan89/claude-projekt-template.git`
(Remote `template` in diesem Repo)
**Commit:** `9189959` (voll: `9189959a7d4de0486a4fee1e30b57ea8e5644661`) —
„Merge pull request #12 from DerStefan89/harness-fix/8-start-klein"; am
11.10.2026 nach `git fetch template` weiterhin Stand von `template/main`.
**Snapshot-Datum:** 2026-09-25, Whitelist erweitert 2026-10-11.
**Werkzeug:** `git show 9189959:<pfad>` je Whitelist-Zeile, byte-gleich.
**Gehasht (seit B1a-2, löst F-700):** Abschnitt „Prüfsummen“ unten trägt je
Skelett-Datei den SHA-256 über die Bytes im Arbeitsbaum (eol=lf über
`.gitattributes`). Das Gate `scripts/check-skelett-herkunft.mjs` (in
`npm run check`) wird rot, sobald eine Datei fehlt, hinzukommt oder
abweicht. Pflege: Datei ändern, `node scripts/check-skelett-herkunft.mjs
--ausgeben` laufen lassen, Tabelle ersetzen, Abweichung hier begründen.
Drift Template ↔ Skelett bleibt manuell (Template-Commit oben, Spalte
Herkunft).

## Lokale Abweichungen von der Quelle

- `CLAUDE.md` — seit F-830 (state/findings.md) eine zusätzliche DoD-Zeile
  Reviewer-/QA-Pass sowie Zusätze an „Iterationsende“ und „Prüfrollen als
  Subagenten“ (in Workforce-Läufen weder git noch Commit noch
  Subagent-Review in der Ausführung; Hinweis „kein `cd`“). Seit B1a-2
  zusätzlich ein Absatz unter „Befehle“: Gate-Vorlage Node/TS anwenden, bis
  dahin ist `npm run check` absichtlich rot.
- `ARCHITECTURE.md` (B1a-2) — §1 nennt die Gate-Vorlage.
- `package.json` (B1a-2) — Platzhalter `lint`/`typecheck`/`test` bleiben
  Exit 1, ihr Text trägt `[PLATZHALTER]` und verweist auf
  `docs/harness/gate-vorlage-node.md` statt auf „SETUP.md Punkt 3“; `check`
  beginnt mit `node scripts/check-gates.mjs`. `check:template` unverändert.
- Lokal neu (B1a-2, nicht im Template): `scripts/check-gates.mjs`
  (Mindest-Gates a–d), `scripts/tests-mit-untergrenze.mjs`,
  `docs/harness/gate-vorlage-node.md`.
- F45 B3a (29.10.2026, `features/F45/plan-b3a-v2.md`, F-1249):
  `docs/harness/gate-vorlage-node.md` auf Biome umgestellt (recommended,
  Komplexität 15, `noExplicitAny`, Formatierer im Stil der Workforce,
  `checkJs`; Harness-Dateien ausgenommen); `package.json` `check`
  beginnt mit `node scripts/check-dateigroesse.mjs`; `CLAUDE.md` Absatz
  „Befehle“ nennt Formatierer, Komplexitätsgrenze und Dateigrenze, „Bestehende
  Helper“ gilt für jeden neuen Code; `.claude/agents/architecture-advisor.md`
  (Pflichtfragen) und `code-reviewer.md` („Was kann weg?“) — byte-gleich zur
  Workforce, sonst gälten sie in neuen Projekten als nicht freigegeben
  (Test `scripts/check-skelett-herkunft.test.mjs`). Lokal neu:
  `scripts/check-dateigroesse.mjs` (Dateigrenze 800 Zeilen, ohne Ratsche).

Bereits angelegte Projekte (z. B. haushaltsbuch2) behalten ihre alte
Fassung, weil `kopiereSkelett` nichts überschreibt. Nachrüsten:
`npm run projekt:nachruesten -- <Projektpfad>` (Probelauf), dann mit
`--anwenden` (kopiert nur Fehlendes).

## Hook-Gruppe (B1a-2)

`.claude/settings.json` und `.claude/hooks/*` (Template-Fassung, CommonJS
`.js`) sind seit B1a-2 im Skelett. Sie bilden eine Gruppe, die nur ganz
oder gar nicht kopiert wird: nur wenn im Ziel KEINE ihrer Dateien liegt
(`planeSkelettKopie`, `src/projekt-anlegen/index.ts`). Neue Projekte über
`POST /api/projekte` bekommen settings.json und Hooks vorher aus
`kopiereBaseline` (ai-workforce, byte-gleich, sonst scheitert E-183 am
Ziel) — für sie wird die Gruppe also immer übersprungen, ihre
Startfreigabe ändert sich nicht. Wirksam wird die Gruppe beim Nachrüsten
eines Projekts ohne eigene settings.json (dann „Startfreigabe neu
erteilen“) und bei Projekten außerhalb des Anlegewegs. Projekte mit
`"type": "module"` bekommen die Gruppe beim Nachrüsten nicht (CommonJS-
Hooks stürzten ab und ließen Befehle durch).

## Whitelist

### Explizit vom Auftrag benannt (F42)

| Pfad | Begründung |
|---|---|
| `CLAUDE.md` | Kernanweisung — ohne sie hat kein neues Projekt Entscheidungsregeln/DoD (löst F-667/F-673-Nachbarschaft, `state/findings.md`). |
| `ARCHITECTURE.md` | Kernanweisung, von `CLAUDE.md` referenziert. |
| `.claude/agents/architecture-advisor.md`, `code-reviewer.md`, `qa.md` | Prüfrollen-Subagenten — Rollen wie `architekt` (`src/architekt/index.ts:353`) verweisen bereits auf `.claude/skills/advisor-pass`, das wiederum diese Agenten-Datei referenziert. |
| `.claude/skills/advisor-pass`, `git-flow`, `handoff-vertrag`, `ponytail` (+ `LICENSE`), `repo-audit`, `spec-schreiben`, `werkzeug-auswahl` | Arbeitsweise-Skills, in `CLAUDE.md`/`ARCHITECTURE.md` referenzierte Praxis. |
| `docs/guide/00`…`08` | Einstiegs-/Nachschlagewerk für den Harness selbst, projektübergreifend. |
| `scripts/check-docs.mjs`, `check-rules.mjs`, `check-contract.mjs` | Mechanik-Gates, stackunabhängig (`npm run check:template`). |
| `package.json` | Trägt `check`/`check:template`-Scripts und die Platzhalter-Scripts. |
| `state/tasks/.gitkeep` | Ordner-Platzhalter für `check-contract.mjs`. |

### Zusätzlich, weil sonst tote Verweise entstünden (check-docs Prüfung 1)

| Pfad | Referenziert von |
|---|---|
| `docs/STATUS.md` | `CLAUDE.md` |
| `docs/kommentar-standard.md` | `CLAUDE.md`, `ARCHITECTURE.md` |
| `docs/harness/werkzeug-katalog.md` | `.claude/skills/werkzeug-auswahl/SKILL.md` |
| `state/tooling.md` | `.claude/skills/werkzeug-auswahl/SKILL.md` |

Verifiziert (25.09.2026): `scripts/check-docs.mjs` scannt Prüfung 1 nur
fest benannte Root-Dateien, Prüfung 3/4 nur root-`docs/harness/`/`state/`
rekursiv — `vorlagen/projekt-skelett/**` liegt außerhalb aller
Scan-Wurzeln dieses Repos, KEINE Gate-Ausnahme nötig.

**Bekannte Grenze — `state/tooling.md`:** der Snapshot-Inhalt trägt noch
die Beispielzeilen des TEMPLATE-Projekts selbst (gitleaks, `ponytail`
Versionspin) — das beschreibt das Template, nicht das neue Projekt. Wird
unverändert mitkopiert und muss beim ersten echten `werkzeug-auswahl`-Lauf
im neuen Projekt korrigiert werden.

### Zusätzlich, unter „state/-Vorlagen" (F42)

`state/gates.md`, `state/memory-map.md`, `state/assumption-ledger.md`,
`state/reibung.md`, `state/triggers.md`, `state/zwischenstand/VORLAGE.md`
— geprüfte `[PROJEKTNAME]`-Skelette ohne Template-Fremdinhalt.

### Nachgezogen in F45 B1a-2 (gleiche Bremsen wie das Template, F-939)

| Pfad | Begründung |
|---|---|
| `.claude/settings.json`, `.claude/hooks/commit-guard.js`, `guard-settings.js`, `session-reminder.js`, `zwischenstand-laden.js`, `zwischenstand-pruefen.js` | Hooks des Templates (Commit-Freigabe, settings-Schutz, Kontext-Hygiene, Zwischenstand). Hook-Gruppe, siehe oben. Beleg je Hook, dass im `-p`-Lauf nichts Nötiges blockiert wird: `scripts/skelett-hooks.test.mjs`. |
| `.claude/commands/lessons.md` | `/lessons` wie im Template. |
| `docs/examples/design-guardian.example.md` | Template-Fassung von design-guardian; liegt im Template nur als Beispiel (alle Pfade `[FUELLUNG]`, nicht auf ai-workforces `public/leitstand` festgelegt). Aktiviert wird er nur in UI-Projekten (SETUP.md Punkt 2, B3). |
| `.github/workflows/ci.yml` | CI mit `check:template` und gitleaks-Secret-Scan, nur Template-Schritte (keine ai-workforce-Schritte wie den F20-Klicktest). |
| `.worktreeinclude`, `.claudeignore` | Worktree- und Kontext-Hygiene des Templates. |
| `SETUP.md` | Behebt die toten Verweise „SETUP.md Punkt …“ in `scripts/check-docs.mjs` (Zeilen 87, 248) und `scripts/check-rules.mjs` (Zeile 88). |
| `scripts/check-gates.mjs`, `scripts/tests-mit-untergrenze.mjs`, `docs/harness/gate-vorlage-node.md` | Lokal neu: Mindest-Gates Node/TS (Platzhalter, `npm audit`, gitleaks, Hook-Probelauf) und Test-Untergrenze. |

### Nachgezogen in F45 B2b-3b-2b-2b-2a (Zeilenenden)

| Pfad | Begründung |
|---|---|
| `.gitattributes` | Byte-gleich aus dem Template (`* text=auto eol=lf`). Bedarfsnachweis: Nachweislauf Rückfrage-Kanal 17.10.2026 — mit `core.autocrlf=true` bekam der Arbeitsordner CRLF und E-183 lehnte jeden schreibenden Lauf ab (Kernschutz: `-c core.autocrlf=false -c core.eol=lf` in `src/arbeitsordner/index.ts`). Nachrüsten legt sie nur an, wenn sie fehlt; eine vorhandene, abweichende `.gitattributes` bleibt. Wirkt als verschachtelte `.gitattributes` auch auf `vorlagen/projekt-skelett/**` in ai-workforce selbst — heute gleich der Wurzel-Datei; weicht sie ab, ändern sich die gespeicherten Bytes und damit die Prüfsummen unten. |

### Nachgezogen in F45 B3a (Qualitätsprinzipien)

| Pfad | Begründung |
|---|---|
| `scripts/check-dateigroesse.mjs` | Lokal neu: harte Dateigrenze für Code-Dateien (E-W2-1), läuft vorne in `npm run check`, ohne Abhängigkeit. Test: `scripts/skelett-check-dateigroesse.test.mjs`. |

## Ausgeschlossen (explizit)

- `scout` — gibt es im Template nicht; ai-workforces `.claude/agents/scout.md`
  ist F27-spezifisch (ressourcen.json, Capability Gap im Workboard).
- `state/tasks/harness-fix-*.md`, `state/tasks/phase0-artefakte-
  committen.md` — Template-eigene Baugeschichte, kein Skelett.

## Ausgeschlossen (nicht angefordert, kein Bedarfsnachweis)

`README.md`, `START-KLEIN.md`, `LICENSE` (Root),
`.gitignore` (neues Projekt bekommt seines aus
`schreibeStartvorlageUndProfil`), `docs/adr/TEMPLATE.md`,
`docs/harness/HARNESS-*.md`, `docs/harness/zaehne-taxonomie.md`,
`docs/onboarding/*`, `scripts/_mode.ts`, `specs/.gitkeep`,
`state/advisor-findings-*.md`, `state/plan-v1/v2-*.md` (Template-eigene
Advisor-Historie).

## Prüfsummen

| Pfad | SHA-256 | Herkunft |
|---|---|---|
| `.claude/agents/architecture-advisor.md` | `1ee1925b4c0f39e07c4786cfacf3214b311cc1f2c442303d35988649ecb3d1ce` | lokal geändert |
| `.claude/agents/code-reviewer.md` | `c2d0f75810d0218bf99d441904e2dce3fb9f892e4d8f3ae0fd4fea9c0fc67cdd` | lokal geändert |
| `.claude/agents/qa.md` | `5aed8133c1084e55839535b9384d3d1afbfce9689e7c585c9b9122570b103874` | template |
| `.claude/commands/lessons.md` | `5ec433bf46d085dd4d97e4170f8eb74510029e3e07c96398b9d457a49977b4ab` | template |
| `.claude/hooks/commit-guard.js` | `7bf501e25335aceed7191d3a6903cc171768c5d8904b9db91177cce7c36182cf` | template |
| `.claude/hooks/guard-settings.js` | `dbc0c2ff83e0f32e284ce7a28d3c93b4686dc806fdd9823b1a7f3eae37d6a58a` | template |
| `.claude/hooks/session-reminder.js` | `73c006bc03bc3484f4101d21ad6345a7714c6f041191944dafbf7a004d45a49c` | template |
| `.claude/hooks/zwischenstand-laden.js` | `32c7cc556ab3667a6de42a89e38c8071d3fe7d0a9640acea3c03a0bd22833714` | template |
| `.claude/hooks/zwischenstand-pruefen.js` | `4e1030fdb3102e29b8f29b2a8134c11ce198b58a2943e2531bd7cc32edc977f1` | template |
| `.claude/settings.json` | `e34f6c8e6734c477abdce66459c3814026d71b09ce6ffcb884f60fec272eb67e` | template |
| `.claude/skills/advisor-pass/SKILL.md` | `7369cb0f97d2fbf5055745bd7b6908293a7292445a3d7569f77dd2a860deaf09` | template |
| `.claude/skills/git-flow/SKILL.md` | `4938521d876532d961587133062b4ae816751fb5769a3c8e6c7c0dec514356e2` | template |
| `.claude/skills/handoff-vertrag/SKILL.md` | `717d35eb762dcd11e5933e302c5fe599eb27ef96dd6aa5b36e1648f2b8172eb2` | template |
| `.claude/skills/ponytail/LICENSE` | `fb1bc6909ac3ef82d5c22106e32ef682b0cff66788fa915fb9b53b15c9d2f3ab` | template |
| `.claude/skills/ponytail/SKILL.md` | `6e8c15d90eb6274171b24a399b9f6aa0449c50615fdbd00fc68667a23051a8f7` | template |
| `.claude/skills/repo-audit/SKILL.md` | `d4032e05f745f79930ad5e0c2e18d3fe1dc3b227e05c17ea4a52b372052f305b` | template |
| `.claude/skills/spec-schreiben/SKILL.md` | `d97a4fa00a4cb504f5285129c5586837d5da7576353927d0067a671b399da30d` | template |
| `.claude/skills/werkzeug-auswahl/SKILL.md` | `e6650a36c74e36abcb64a02336f0a3a6e37b57a9299609a3134d4f4849ba5726` | template |
| `.claudeignore` | `5c92932f95648f7e2ce3abd8975181b283b4a2069bc543d91874352e79dbda6e` | template |
| `.gitattributes` | `78dcc69557b57e737e065c8d41dc5c42514d46133246ca289d932c535e8f59a6` | template |
| `.github/workflows/ci.yml` | `f8cc52dd4925bb65dc4fa05f671106410473bd38b2dfdfab2806bdf24d8b5a11` | template |
| `.worktreeinclude` | `85d4f37b3364e1ba621c7d50e22564d8b9cfb239732fe8bbd64f5820a7d79311` | template |
| `ARCHITECTURE.md` | `809dc26a10a3e9b51a5d1ca5590dde6ab39da59280bb3203ed3daa3785b0a114` | lokal geändert |
| `CLAUDE.md` | `90bca5ca50a9b3d6150d420b006a36cd174857c191c2c1611d6aad66f8b15d44` | lokal geändert |
| `SETUP.md` | `9723241385112779f5a4b573f56b972444cf983e79fd058d4f6d5deca911859c` | template |
| `docs/STATUS.md` | `c25aa98804a3def29590cd8c8633390bafafaaee45efca87e1fc6f2e00c0c1df` | template |
| `docs/examples/design-guardian.example.md` | `a7d7ff2a30b9bb096d36c5ca41beed7cc03acef8c9180c0988b24748754872e6` | template |
| `docs/guide/00-START-HIER.md` | `38593b6af334f9821b5e20d336f749790053e8f98cbea093552f73b874b02c8f` | template |
| `docs/guide/01-DEEPDIVE-regeln.md` | `b12bbe6883b707e710908d712a06d6d7a3e5d904aff3e599ab2fa81e873de588` | template |
| `docs/guide/02-DEEPDIVE-claude-ordner.md` | `7b12306bcb3ed724b6281d7bd557eab079f9d575e28f43c4b30445c3035fd53b` | template |
| `docs/guide/03-DEEPDIVE-gates.md` | `a7378052117453338254c1b848c2400d151661e29733db28fac4a56b5c90bd38` | template |
| `docs/guide/04-DEEPDIVE-gedaechtnis.md` | `30cf2c11e44799cdd0aae129a0e2d45b08429594681b6c1eb0c54de20b32a855` | template |
| `docs/guide/05-SKELETT-ODER-FUELLUNG.md` | `a5f4988659b2bd3017ea8fa97f9c3695202ff4e7e25689645e30d073c1326525` | template |
| `docs/guide/06-DER-PROZESS.md` | `a1db590ebdd70374f30cc45ed1eb60c9c5209248b73d7deeb8a2bb0bb85178e2` | template |
| `docs/guide/07-TOKEN-SPAREN.md` | `5e9d4f64c05b56f912e9913c5384b719ef7940248136448da5b18cb9c20ff3a6` | template |
| `docs/guide/08-EIGENES-PROJEKT.md` | `2b58f899a1d00082baac9bc195b385ac020ce5ea44d406424aa4c193a3c9c407` | template |
| `docs/harness/gate-vorlage-node.md` | `7e5edbfa0c00ef63a82ee4d658c4a29e7046367604b80a4ada1ca8d6b48adfc1` | lokal neu |
| `docs/harness/werkzeug-katalog.md` | `87d18fefc3e469bdbede6a7d366ba759b63372368faefd4e42f93d17aca18dcd` | template |
| `docs/kommentar-standard.md` | `77b9e43c4b50414c1c50c9c19af27303f5bc1b5e7a2b0a53afd605e6beed75b3` | template |
| `package.json` | `4ef99df22c56f586126d2095b48ffc280b52e4b1179cfdc75faa99bf173a6c2f` | lokal geändert |
| `scripts/check-contract.mjs` | `c7b13eee41d9014e8942d0f349244eab4c67300df9f450c56abea227496a285d` | template |
| `scripts/check-dateigroesse.mjs` | `844cf3cd5a65c9ae153225c4d772cab625d98063ecdc7e218e54e3274e34249a` | lokal neu |
| `scripts/check-docs.mjs` | `88d76a731120c1f50aff9734ce0ef957f1682e4aeded8ddf45e5a7907a784651` | template |
| `scripts/check-gates.mjs` | `7c1b7427024ab0d0b912596a7c681b5beac8a6ab034a3ba5fcd6fe8dd9570621` | lokal neu |
| `scripts/check-rules.mjs` | `ceb6cbff96fff062c4e1ca9d09d880a195d02d2d34b6d442eddd97969e9f5534` | template |
| `scripts/tests-mit-untergrenze.mjs` | `1beda7502b35012e3c2746397505f153c77475dea986643df089afd2a3ca34b6` | lokal neu |
| `state/assumption-ledger.md` | `efb81d71790fdaa21b11615615341c15bb073088f263915468464a9a7d9a92ba` | template |
| `state/gates.md` | `87026e65f7bd4839962a897db65b8e72e94b2f5cf5c1316b1b29ca88b3eea254` | template |
| `state/memory-map.md` | `67410f7da1d6a978e7b75c62e7344a28ac1c7c8845c3132d5bd27cb1c495cb6b` | template |
| `state/reibung.md` | `e2bb528d0ca2a858099c228c730e743af0d9b76c36587e2abeb2366b9b4638ec` | template |
| `state/tasks/.gitkeep` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | template |
| `state/tooling.md` | `3ecd3f46debd71ea09724c63198393b9aa53691ebc3363c92d6f403a6251e576` | template |
| `state/triggers.md` | `29f7f2bc7056df64c9853ffb1be9fc640fb03b3aa668802f32b3911ce1de8432` | template |
| `state/zwischenstand/VORLAGE.md` | `d4f8ca8257513e55ae773152f4fc0bef49002b5e39cb7cd5baf9f56f42137125` | template |
