<!--
Diese Datei selbst ist NICHT Teil des kopierten Skeletts — kopiereSkelett
(src/projekt-anlegen/index.ts) überspringt sie ausdrücklich.
-->

# Herkunft — vorlagen/projekt-skelett/

F42 Projekt-Harness WS-1 (E-F41-3 = B, Schichtenmodell Baseline/Skelett/
Füllung, `docs/projekt/zielfassung.md` §13.6).

**Quelle:** `https://github.com/DerStefan89/claude-projekt-template.git`
(Remote `template` in diesem Repo)
**Commit:** `9189959` — „Merge pull request #12 from
DerStefan89/harness-fix/8-start-klein"
**Branch zum Zeitpunkt des Snapshots:** `main`
**Snapshot-Datum:** 2026-09-25
**Werkzeug:** `git show 9189959:<pfad>` je Whitelist-Zeile — **nicht
gehasht**, kann von der Quelle driften (state/findings.md F-700, TECH_DEBT,
bewusst nicht automatisiert nachgezogen).

## Whitelist

### Explizit vom Auftrag benannt

| Pfad | Begründung |
|---|---|
| `CLAUDE.md` | Kernanweisung — ohne sie hat kein neues Projekt Entscheidungsregeln/DoD (löst F-667/F-673-Nachbarschaft, `state/findings.md`). |
| `ARCHITECTURE.md` | Kernanweisung, von `CLAUDE.md` referenziert. |
| `.claude/agents/architecture-advisor.md`, `code-reviewer.md`, `qa.md` | Prüfrollen-Subagenten — Rollen wie `architekt` (`src/architekt/index.ts:353`) verweisen bereits auf `.claude/skills/advisor-pass`, das wiederum diese Agenten-Datei referenziert. |
| `.claude/skills/advisor-pass`, `git-flow`, `handoff-vertrag`, `ponytail` (+ `LICENSE`), `repo-audit`, `spec-schreiben`, `werkzeug-auswahl` | Arbeitsweise-Skills, in `CLAUDE.md`/`ARCHITECTURE.md` referenzierte Praxis. |
| `docs/guide/00`…`08` | Einstiegs-/Nachschlagewerk für den Harness selbst, projektübergreifend. |
| `scripts/check-docs.mjs`, `check-rules.mjs`, `check-contract.mjs` | Mechanik-Gates, stackunabhängig (`npm run check:template`). |
| `package.json` | Trägt `check`/`check:template`-Scripts und die Platzhalter-Scripts (`lint`/`typecheck`/`test` verweisen auf `werkzeug-auswahl`). |
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
unverändert mitkopiert (Snapshot = literale Kopie, keine
Content-Bereinigung — Füllung ist ausdrücklich Nicht-Ziel von WS-1) und
muss beim ersten echten `werkzeug-auswahl`-Lauf im neuen Projekt korrigiert
werden.

### Zusätzlich, unter „state/-Vorlagen" (Auftrag Kontext)

`state/gates.md`, `state/memory-map.md`, `state/assumption-ledger.md`,
`state/reibung.md`, `state/triggers.md`, `state/zwischenstand/VORLAGE.md`
— geprüfte `[PROJEKTNAME]`-Skelette ohne Template-Fremdinhalt (Stichprobe
25.09.2026), gehören zur selben Kategorie wie `state/tooling.md`.

## Ausgeschlossen (explizit)

- `.claude/settings.json`, `.claude/hooks/*` — Baseline gewinnt (E-F41-1
  bleibt unverändert; `kopiereBaseline` bleibt alleinige Quelle dafür).
- `state/tasks/harness-fix-*.md`, `state/tasks/phase0-artefakte-
  committen.md` — Template-eigene Baugeschichte, kein Skelett.

## Ausgeschlossen (nicht angefordert, kein Bedarfsnachweis)

`README.md`, `START-KLEIN.md`, `SETUP.md`, `LICENSE` (Root),
`.github/workflows/ci.yml`, `.gitattributes`, `.gitignore` (neues Projekt
bekommt seines aus `schreibeStartvorlageUndProfil`), `.worktreeinclude`,
`.claudeignore`, `.claude/commands/lessons.md`, `docs/adr/TEMPLATE.md`,
`docs/examples/*`, `docs/harness/HARNESS-*.md`,
`docs/harness/zaehne-taxonomie.md`, `docs/onboarding/*`, `specs/.gitkeep`,
`state/advisor-findings-*.md`, `state/plan-v1/v2-*.md` (Template-eigene
Advisor-Historie).
