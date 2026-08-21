<!-- Ziel-Pfad im Repo: state/tooling.md -->
# Tooling-Bestand — [PROJEKTNAME]

## Im Einsatz

| Werkzeug | Zweck | Eingeführt (Datum) | Über Skill `werkzeug-auswahl` geprüft? |
|---|---|---|---|
| gitleaks | Secret-Scan in CI | 2026-08-08 (Commit `e23a9bb`, initiales Template-Gerüst) | [Annahme] vermutlich nein — vor diesem Programm eingeführt, keine Prüfspur gefunden |
| `.claude/skills/ponytail/` (vendorte Kopie, Versionspin `v4.8.4`, Lizenz MIT) | Ladder-Verfahren gegen Over-Engineering | 2026-08-08 (per `git log --diff-filter=A -1 --format=%as -- .claude/skills/ponytail/SKILL.md`) | [Annahme] vor diesem Programm übernommen, keine Prüfspur über den Skill `werkzeug-auswahl` gefunden |
| Biome (`@biomejs/biome`, Versionspin `2.5.9` exakt, kein Caret) | Linter, minimaler Regelsatz — kein explizites `any`, nicht abgewartete Promises gemeldet; Klasse C | Werkzeugwahl geprüft 2026-08-21 — Installation folgt in AP 1b (`harness-setup-1b-installation-und-pruefkette`) | Ja, 2026-08-21 (Schritte 3–6). Quelle `github.com/biomejs/biome`, org-maintained (biomejs), 25,6k★, 10.684 Commits, aktiv (137 offene PRs, 398 offene Issues). Lizenz MIT OR Apache-2.0. Release-Kadenz wöchentlich, `2.5.9` publiziert 2026-08-17, gegen npm-Registry am 2026-08-21 erneut verifiziert — deckt sich mit Plan v2 §3, kein Versionsdrift. Installationsweg: npm-Paket ohne `postinstall`-Skript, lädt Plattform-Binary über `optionalDependencies` (gleiches Muster wie z. B. esbuild/swc). Risiko: gering — reines Dev-Tool, kein Auth-/Geld-/öffentlicher-Endpunkt-/DB-Zugriff, läuft nur lokal/CI. Kostenwirkung: keine Grundlast im LLM-Kontext, nur CI-/Dev-Laufzeit. Regel `noFloatingPromises` hat Nursery-Status — Rot-Fall-Pflicht in AP 4 (Plan v1 §4 AP 4: fängt der Rot-Fall die Promise nicht, ist Biome hier widerlegt). Telemetrie: siehe „Offener Punkt: Telemetrie von Biome" unten. |
| `tsc` (Paket `typescript`, Versionspin `7.0.2`) | Typechecker, `--strict`; Klasse B | Werkzeugwahl geprüft 2026-08-21 — Installation folgt in AP 1b | Ja, 2026-08-21 (verkürzt, Erstanbieter). Quelle `github.com/microsoft/TypeScript`, Microsoft-Erstanbieter, sehr aktiv (letzter npm-Publish 2026-08-21). Lizenz Apache-2.0. `7.0.2` ist die native Portierung, nicht die klassische JS-Fassung, gegen die Plan v1 §3 ursprünglich formuliert wurde — Entscheidung unverändert, siehe Plan v1 §9, offene Unsicherheit „Welches `tsc`?". Installationsweg: npm-`devDependency`, kein `postinstall`-Skript. Versionsbindung: läuft unter gepinntem Node `24.x` (`package.json` → `engines`), lokal mit Node 24.16.0 bestätigt. Risiko/Kosten: wie Biome — reines Dev-Tool, keine Grundlast. |
| `node:test` (Node-Core-Modul, kein eigenes npm-Paket) | Testrunner, in der Laufzeit enthalten; Klasse B | Werkzeugwahl geprüft 2026-08-21 — keine gesonderte Installation nötig, bereits Teil von Node | Ja, 2026-08-21 (verkürzt, Laufzeit-Bestandteil). Quelle `github.com/nodejs/node`, OpenJS-Foundation/Node-Core-Team, Lizenz MIT (Node-Lizenz). Kein separater Installationsweg — Bindung ausschließlich an gepinntes Node `24.x` (`package.json` → `engines`), lokal Node 24.16.0 bestätigt. Kein eigenes Telemetrie-Risiko über Node-Core hinaus. Risiko/Kosten: keine, kein zusätzlicher Dependency-Fußabdruck. |
| `gh` (GitHub CLI, Version `2.98.0`) | CI-Läufe auslösen/beobachten (`gh run list`/`watch`/`view`) für AP 3 und AP 4 | 2026-08-21 (`harness-setup-3-ci-auf-produktkette`) | Ja, 2026-08-21 (verkürzt, Erstanbieter). Quelle `cli.github.com` / `github.com/cli/cli`, GitHub-Erstanbieter (org `cli`). Lizenz MIT. Installationsweg: `winget install --id GitHub.cli`, Installer-Hash von winget verifiziert. Lokale Maschine, kein Systemdienst. Risiko: gering — reines CLI-Werkzeug für authentifizierte GitHub-API-Zugriffe unter dem Konto des Nutzers, kein Auth-/Geld-Fluss über das Projekt selbst. |

## Bewusst nicht installiert

Werkzeuge, die absichtlich NICHT eingesetzt werden, mit Begründung — das
verhindert, dass dieselbe Frage in einem späteren Zyklus erneut aufgemacht
wird, ohne dass die frühere Entscheidung sichtbar ist.

| Werkzeug | Warum nicht | Entschieden am |
|---|---|---|
| Python (als Laufzeit für den Harness) | Zweite Laufzeit neben Node; holt die vertagte Prüfbefehl-Indirektion ins Projekt; Typisierung nur konfiguriert statt erzwungen | 2026-08-20 (Plan v1 §3) |
| C#/.NET | Dritte Laufzeit, Prüfkette müsste komplett neu aufgebaut werden — Apparat ohne Bedarf durch einen der sechzehn Drivers | 2026-08-20 (Plan v1 §3) |
| Go und Rust | Bedienen keinen der sechzehn Drivers; kosten Iterationsgeschwindigkeit | 2026-08-20 (Plan v1 §3) |
| ESLint mit typescript-eslint | Exakter bei typbewussten Regeln als Biome, aber deutlich größere Vetting-Fläche — unterlegen gegenüber der Kalibrierungsauflage | 2026-08-20 (Plan v1 §3) |
| Laufender Prozess mit Oberfläche (statt reinem Kommandozeilenwerkzeug) | Führt wieder ein, was Entscheidungsregister-Eintrag D11 gestrichen hat; vertagt als Fassung-2-Kandidat | 2026-08-20 (Plan v1 §3) |

## Offener Punkt: Telemetrie von Biome

[Fakt] Weder `github.com/biomejs/biome` noch die offizielle Dokumentation
(`biomejs.dev`) belegen an einer auffindbaren Stelle, ob Biome Telemetrie
sendet. Eine Telemetrie-Seite unter `biomejs.dev/internals/telemetry/`
existiert nicht (HTTP 404, geprüft 2026-08-21). Weder Bestätigung noch
Dementi.

[Entschieden 21.08.2026, Projektchat, Befund 2 Option A] Wird nicht am
Schreibtisch weiter recherchiert, sondern durch Beobachtung beim ersten
Lauf geklärt. Ziel: **AP 7**, als Installationsauflage (siehe Plan v2 §9).

## Offener Fund: Node-Bindung des Harness

[Fakt] Fünf Hook-Aufrufe laufen über `node`, `package.json` deklariert
`engines.node`, die CI-Toolchain ist Node.

[offene Unsicherheit] Ob das Harness damit node-gebunden ist, oder ob die
Mechanik (ein Prüf-Befehl, ein Gate pro Prüfung) genauso in einem
Python-/Foundry-/ffmpeg-Projekt trägt, ist ungeklärt.

[Entschieden 17.08.2026] Frage erneut vertagt — Ziel-Phase: Phase 3,
zusammen mit der Prüfbefehl-Indirektion 3b
(`state/plan-v2-phase2-adoptionsfaehigkeit.md`). Kein Fix in diesem
Vertrag.

## Harness-Herkunft

[Fakt] Dieses Repository wurde am 2026-08-21 aus dem Vorlagen-Repo geklont,
gepinnt auf den Stand `9189959a7d4de0486a4fee1e30b57ea8e5644661`
(erreichbar über den Branch `template-baseline`).

[Fakt] Remote-Namen laut `git remote -v`: `template` →
`https://github.com/DerStefan89/claude-projekt-template.git` (fetch/push).
Nur lesend zu verwenden — Upgrade und Rückfluss als gezielter
Diff/Cherry-Pick, nie als Merge in `main` (Ziel-Fassung v1.4, Abschnitt 7).

[Annahme] Ein Klon mit zwei Remotes berührt die im Repo dokumentierten
Windows- und Cloud-Sync-Fallen nicht. Ungeprüft, kein Grund zum Anhalten —
Beobachtung aus `state/tasks/harness-setup-0-repository-anlegen.md`.
