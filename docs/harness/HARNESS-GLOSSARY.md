<!--
Ziel-Pfad im Repo: docs/harness/HARNESS-GLOSSARY.md
Stand dieser Fassung: 18.08.2026
-->
# Harness Glossary — [PROJEKTNAME]

Begriffe, die im Projekt eine spezifische, vom Alltagsgebrauch abweichende
oder erklärungsbedürftige Bedeutung haben. Nicht jeder Fachbegriff gehört
hierher — nur die, bei denen Verwechslung real vorgekommen ist oder
wahrscheinlich ist.

| Begriff | Bedeutung | Warum relevant | Fundstelle |
|---|---|---|---|
| Haltbarkeitsklassen A–D | wie lange ein Eintrag im Werkzeug-Katalog voraussichtlich gilt | hieß früher „Vier-Ebenen-Regel", der alte Name kursiert noch und kollidiert mit der Regelhierarchie | `docs/harness/werkzeug-katalog.md` |
| Vier-Ebenen-Regelhierarchie | Mensch → Modell-Evaluator → deterministische Gates → Berechtigungen | gleiche Zahl, anderer Gegenstand als die Haltbarkeitsklassen | `README.md` und `docs/guide/00-START-HIER.md` |
| `architecture-advisor` (Harness-Subagent) | Claude-Code-Subagent dieser Harness-Sitzung unter `.claude/agents/` — prüft einen Plan VOR dem Bau, read-only, ohne Schreibrechte, **außerhalb** jeder `WORKFLOW_V0`-Kette (kein Leitstand-Lauf, kein Worker-Prozess) | Trägt denselben Namen wie die Workforce-**Rolle** `architecture-advisor` (nächste Zeile) — ein Claude-Code-Subagentenaufruf ist ein anderer Mechanismus als ein vertragsgeprüfter Rollen-Lauf; eine Änderung an diesem `.md` wirkt NICHT auf `workflow-vorlagen/hoch.json` | `.claude/agents/architecture-advisor.md` |
| `architecture-advisor` (Workforce-Rolle) | Workforce-**Rolle** (`ROLLENVERTRAEGE['architecture-advisor']`, `src/rollen/index.ts` — lesend, `erlaubtes_output_schema: null`) — **das ist der reale Prüfer im `hoch`-Workflow**: Schritt 1 in `workflow-vorlagen/hoch.json`, Worker `codex`, `freigabe: ZWINGEND`. Läuft als eigener, vertragsgeprüfter Lauf über den Leitstand — **innerhalb** einer `WORKFLOW_V0`-Kette, nicht als Subagentenaufruf | Verwechslungsgefahr mit dem gleichnamigen Harness-Subagenten (Zeile oben) — beide heißen `architecture-advisor`, sind aber unabhängige Mechanismen ohne gemeinsamen Code; eine Änderung am `.claude/agents/`-Subagenten wirkt nicht auf diesen Workflow-Schritt und umgekehrt | `src/rollen/index.ts`, `workflow-vorlagen/hoch.json` (Schritt `schritt-1-architektur`) |
| `architekt` (Workforce-Rolle, F39) | Workforce-**Rolle** (F39 WS-1, `ROLLENVERTRAEGE.architekt`) — Autor, entwirft Modulschnitt, ADR-Entwürfe, Schema-Entwürfe und offene Grundsatzentscheidungen VOR dem Bau, lesend, `ergebnis-architektur`-Schema, geprüft von `scripts/check-f39-architekt.mjs`. Wird in F39 WS-2 als eigener Schritt VOR der Workforce-Rolle `architecture-advisor` in `workflow-vorlagen/hoch.json` eingehängt (Autor zuerst, dann Prüfer) | Verwechslungsgefahr mit den beiden `architecture-advisor`-Zeilen oben (ähnlicher Name, aber Autor statt Prüfer) — `architekt` ersetzt keine der beiden, alle drei laufen unabhängig voneinander | `src/rollen/index.ts`, `src/architekt/index.ts`, `features/F39/feature.md`, `workflow-vorlagen/hoch.json` (ab F39 WS-2) |
