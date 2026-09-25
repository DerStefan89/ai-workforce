# F42 WS-3 — Messung des realen Reallaufs (Projekt-Harness gegen ein zweites Fremdprojekt `haushaltsbuch2`)

Reallauf gegen ein neu über `POST /api/projekte` angelegtes zweites
Fremdprojekt (`haushaltsbuch2`) — erstmals mit inhaltlichem Ergebnis in
einem Fremdprojekt, nicht nur mechanisch wie im ersten Reallauf gegen
`haushaltsbuch` (`features/F41/nachweis-ws3-reallauf-messung.md`, F-666).
Prüft F42 WS-1 (Skelett, Prüfbefehl, Trust-Hinweis, Coach-Anzeige) und
WS-2 (Architekt darf offenen Stack nicht selbst festlegen) real gegen ein
Projekt, das über den vollen Weg Anlage → Trust → Coach → Architekt →
Advisor → Ausführung → Review → Korrekturschleife läuft.

## Ergebnistabelle

| Ziel | Mechanik | Inhalt | Beleg |
| --- | --- | --- | --- |
| Z1 Anlage | ✅ | ✅ | `haushaltsbuch2`: Skelett vollständig, Baseline-Hashes identisch zu ai-workforce (`settings.json`, 5 Hooks, `aktuelle-autorisierung.json`), Trust-Hinweis mit exaktem Pfad. |
| Z2 Trust | ✅ | ✅ | `~/.claude.json`: `"C:/Users/stefa/Projekte/haushaltsbuch2"` `hasTrustDialogAccepted true`, genau ein Eintrag. |
| Z3 Prüfbefehl | ✅ | ✅ | `check:template` grün (3 Skripte), `startvorlagen/haushaltsbuch2.json` `pruefbefehl` gesetzt (`npm-cli.js` via `npm_execpath`). |
| Z4 Coach | ✅ | ✅ | Auftrag `4f11b37d` nennt „npm run check:template muss danach grün sein.", keine ai-workforce-Prüfungen. |
| Z5 Architekt | ✅ | ✅ | Lauf `20037ee3` (codex): 1× `kategorie stack`, 2× fachlich; Halt; Stefan wählt TypeScript/Node.js/SQLite. |
| Advisor | ✅ | ✅ | Lauf `248e4987`: `BEREIT_NACH_KORREKTUR` (HTTP-Origin-Schutz, Migration, Währungsannahme); nutzt Projekt-Skelett als Kontext. |
| Z6 Ausführung | ✅ Prüfschritt GRÜN | ⚠️ | Lauf `3e0c0a31`: Doku geschrieben, aber Scope überschritten (`schemas/`, `scripts/check-schemas.mjs`, `package.json`-Check-Ketten erweitert, `state/gates.md`, ADR 0001–0003) → F-712, F-713. |
| Z7 Review | ✅ | ✅ | Lauf `fce33a89`: `BEREIT_NACH_KORREKTUR`, HOCH Scope, MITTEL Stack-Festlegung unbelegt. |
| Z8 Füllung | — | ❌ | `CLAUDE.md`-Stack-Abschnitt blieb `[FÜLLUNG]`; ADR-0003 eigenmächtig → F-714. |
| Korrekturschleife | ✅ | ⚠️ | Anpassung angefordert; Neustart erst nach Commit von Iteration 1 (Sauberkeitssperre, bekannt aus F39); Lauf `28fd1ae5`: Abnahme-Begründung kam über Kontextpaket an und wurde umgesetzt; Löschen unmöglich (Werkzeugsatz ohne Löschwerkzeug), ehrlich als Blockiert gemeldet → `KLAERUNG` korrekt → F-715; Rest manuell gelöscht, Workflow gestoppt. |

## Kernaussage

F42 WS-1/WS-2 erfüllen ihre Ziele (F-684, F-667, F-690, F-685, F-695) —
erstmals inhaltliches Ergebnis in einem Fremdprojekt, nicht nur ein
mechanisch bestandener, inhaltlich leerer Durchlauf wie im ersten Reallauf
gegen `haushaltsbuch`. Die dabei neu aufgedeckten Lücken (Ausführung
überschreitet den per Auftrags-Scope erlaubten Rahmen, menschliche
Stack-Entscheidung bleibt ohne verpflichtenden Bauschritt im
Kontrollzustand stecken, der schreibende Werkzeugsatz kann Korrekturen mit
nötigen Löschungen nicht selbst umsetzen) sind als F-709 bis F-716 in
`state/findings.md` festgehalten.
